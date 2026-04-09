'use server';

import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/database';
import Reunion from '@/lib/models/reunion.model';
import Bench from '@/lib/models/bench.model';
import Queue from '@/lib/models/queue.model';
import Group from '@/lib/models/group.model';
import Match from '@/lib/models/match.model';
import { syncUser } from './user.actions';
import type {
  ClerkUserPayload,
  MatchDto,
  PlayerDto,
  ReunionDetailsDto,
  ReunionSummaryDto,
  UserGroupDto,
} from './types';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function buildClerkPayload(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): ClerkUserPayload {
  return {
    id: user.id,
    email_addresses: user.emailAddresses.map((e) => ({
      email_address: e.emailAddress,
    })),
    username: user.username,
    first_name: user.firstName,
    last_name: user.lastName,
    image_url: user.imageUrl,
  };
}

async function getCurrentBackendUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('Authentication required');
  return syncUser(buildClerkPayload(clerkUser));
}

export async function createReunion(name: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('Authentication required');

  try {
    await connectToDatabase();

    const user = await syncUser(buildClerkPayload(clerkUser));
    const code = generateCode();

    const reunion = await Reunion.create({
      name,
      code,
      admin: user._id,
    });

    await Bench.create({ reunion: reunion._id, players: [user._id] });
    await Queue.create({ reunion: reunion._id, groups: [] });

    return reunion.toObject();
  } catch (error) {
    console.error('Error creating reunion:', error);
    throw new Error('Failed to create reunion');
  }
}

export async function joinReunion(code: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('Authentication required');

  try {
    await connectToDatabase();

    const user = await syncUser(buildClerkPayload(clerkUser));
    const reunion = await Reunion.findOne({ code, isActive: true }).lean();

    if (!reunion) {
      throw new Error('Reunion not found or inactive');
    }

    const isInGroup = await Group.exists({
      reunion: reunion._id,
      members: user._id,
    });
    if (isInGroup) return reunion as ReunionSummaryDto;

    const bench = await Bench.findOne({ reunion: reunion._id });
    if (!bench) throw new Error('Bench not found');

    const isPlayerInBench = bench.players.some(
      (p: { toString: () => string }) => p.toString() === user._id.toString(),
    );
    if (!isPlayerInBench) {
      bench.players.push(user._id);
      await bench.save();
    }

    return reunion as ReunionSummaryDto;
  } catch (error) {
    console.error('Error joining reunion:', error);
    throw error;
  }
}

export async function getReunionDetails(
  reunionId: string,
): Promise<ReunionDetailsDto | null> {
  try {
    await connectToDatabase();

    const reunion = await Reunion.findById(reunionId).populate('admin').lean();
    if (!reunion) return null;

    const bench = await Bench.findOne({ reunion: reunionId })
      .populate('players')
      .lean<{ players: PlayerDto[] } | null>();
    const groups = await Group.find({ reunion: reunionId })
      .populate('members')
      .lean<UserGroupDto[]>();
    const queue = await Queue.findOne({ reunion: reunionId })
      .populate({ path: 'groups', populate: { path: 'members' } })
      .lean<{ groups: UserGroupDto[] } | null>();
    const activeMatch = await Match.findOne({
      reunion: reunionId,
      status: 'playing',
    })
      .populate({ path: 'groupA', populate: { path: 'members' } })
      .populate({ path: 'groupB', populate: { path: 'members' } })
      .lean<MatchDto | null>();

    return {
      reunion: reunion as ReunionSummaryDto,
      bench: bench ?? { players: [] },
      groups: groups ?? [],
      queue: queue ?? { groups: [] },
      activeMatch: activeMatch ?? null,
    };
  } catch (error) {
    console.error('Error fetching reunion details:', error);
    return null;
  }
}

async function leaveReunionById(reunionId: string, userId: string) {
  try {
    await connectToDatabase();

    const bench = await Bench.findOne({ reunion: reunionId });
    if (bench) {
      bench.players = bench.players.filter(
        (p: { toString: () => string }) => p.toString() !== userId,
      );
      await bench.save();
    }

    const groups = await Group.find({ reunion: reunionId, members: userId });
    for (const group of groups) {
      group.members = group.members.filter(
        (m: { toString: () => string }) => m.toString() !== userId,
      );
      if (group.members.length === 0) {
        const queue = await Queue.findOne({ reunion: reunionId });
        if (queue) {
          queue.groups = queue.groups.filter(
            (g: { toString: () => string }) =>
              g.toString() !== group._id.toString(),
          );
          await queue.save();
        }

        const match = await Match.findOne({
          reunion: reunionId,
          status: 'playing',
          $or: [{ groupA: group._id }, { groupB: group._id }],
        });
        if (match) {
          match.status = 'finished';
          await match.save();
        }

        await Group.findByIdAndDelete(group._id);
      } else {
        await group.save();
      }
    }
  } catch (error) {
    console.error('Error leaving reunion by id:', error);
    throw error;
  }
}

export async function leaveReunion(reunionId: string) {
  const user = await getCurrentBackendUser();
  return leaveReunionById(reunionId, user._id);
}

export async function ensureUserInReunion(reunionId: string, userId: string) {
  try {
    await connectToDatabase();

    const isInGroup = await Group.exists({
      reunion: reunionId,
      members: userId,
    });
    if (isInGroup) return;

    const bench = await Bench.findOne({ reunion: reunionId });
    if (!bench) return;

    const isPlayerInBench = bench.players.some(
      (p: { toString: () => string }) => p.toString() === userId.toString(),
    );
    if (!isPlayerInBench) {
      bench.players.push(userId);
      await bench.save();
    }
  } catch (error) {
    console.error('Error ensuring user in reunion:', error);
  }
}

export async function kickPlayer(reunionId: string, targetUserId: string) {
  const user = await getCurrentBackendUser();
  const adminId = user._id;

  try {
    await connectToDatabase();

    const reunion = await Reunion.findById(reunionId);
    if (!reunion || reunion.admin.toString() !== adminId) {
      throw new Error('Unauthorized: Only admins can kick players');
    }

    await leaveReunionById(reunionId, targetUserId);
  } catch (error) {
    console.error('Error kicking player:', error);
    throw error;
  }
}
