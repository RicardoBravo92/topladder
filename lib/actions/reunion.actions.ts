'use server';

import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/database';
import { getCurrentBackendUser } from '@/lib/auth';
import Reunion from '@/lib/models/reunion.model';
import Bench from '@/lib/models/bench.model';
import Queue from '@/lib/models/queue.model';
import Group from '@/lib/models/group.model';
import Match from '@/lib/models/match.model';
import { syncUser } from './user.actions';
import { buildClerkPayload } from '@/lib/auth';
import {
  CreateReunionSchema,
  JoinReunionSchema,
  ReunionIdSchema,
} from '@/lib/validation';
import {
  toPlayerDto,
  toUserGroupDto,
  toMatchDto,
  toReunionSummaryDto,
} from '@/lib/types';
import type {
  PlayerDto,
  UserGroupDto,
  MatchDto,
  ReunionDetailsDto,
} from '@/lib/types';
import { randomBytes } from 'crypto';

function generateCode() {
  return randomBytes(3).toString('hex').toUpperCase();
}

export async function createReunion(
  name: string,
  settings: {
    gameMode: 'individual' | 'group';
    groupSize?: number;
    playersAtOnce?: number;
    playersContinue?: number;
  },
) {
  const parsed = CreateReunionSchema.parse({ name, settings });
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('Authentication required');

  try {
    await connectToDatabase();

    const user = await syncUser(buildClerkPayload(clerkUser));
    const code = generateCode();

    const reunion = await Reunion.create({
      name: parsed.name,
      code,
      admin: user._id,
      gameMode: parsed.settings.gameMode,
      groupSize: parsed.settings.groupSize ?? 2,
      playersAtOnce: parsed.settings.playersAtOnce ?? 1,
      playersContinue: parsed.settings.playersContinue ?? 0,
    });

    await Bench.create({ reunion: reunion._id, players: [user._id] });
    await Queue.create({ reunion: reunion._id, groups: [] });

    return toReunionSummaryDto(reunion.toObject());
  } catch (error) {
    console.error('Error creating reunion:', error);
    throw new Error('Failed to create reunion');
  }
}

export async function joinReunion(code: string) {
  const parsed = JoinReunionSchema.parse({ code });
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('Authentication required');

  try {
    await connectToDatabase();

    const user = await syncUser(buildClerkPayload(clerkUser));
    const reunion = await Reunion.findOne({ code: parsed.code, isActive: true }).lean();

    if (!reunion) {
      throw new Error('Reunion not found or inactive');
    }

    const isInGroup = await Group.exists({
      reunion: reunion._id,
      members: user._id,
    });
    if (isInGroup) {
      return toReunionSummaryDto(reunion);
    }

    const bench = await Bench.findOne({ reunion: reunion._id });
    if (!bench) throw new Error('Bench not found');

    const isPlayerInBench = bench.players.some(
      (p: { toString: () => string }) => p.toString() === user._id.toString(),
    );
    if (!isPlayerInBench) {
      bench.players.push(user._id);
      await bench.save();
    }

    return toReunionSummaryDto(reunion);
  } catch (error) {
    console.error('Error joining reunion:', error);
    throw error;
  }
}

export async function getReunionDetails(
  reunionId: string,
): Promise<ReunionDetailsDto | null> {
  const parsed = ReunionIdSchema.parse({ reunionId });

  try {
    await connectToDatabase();

    const reunion = await Reunion.findById(parsed.reunionId).populate('admin').lean();
    if (!reunion) return null;

    const bench = await Bench.findOne({ reunion: parsed.reunionId })
      .populate('players')
      .lean<{ players: PlayerDto[] } | null>();
    const groups = await Group.find({ reunion: parsed.reunionId })
      .populate('members')
      .lean<UserGroupDto[]>();
    const queue = await Queue.findOne({ reunion: parsed.reunionId })
      .populate({ path: 'groups', populate: { path: 'members' } })
      .lean<{ groups: UserGroupDto[] } | null>();
    const activeMatch = await Match.findOne({
      reunion: parsed.reunionId,
      status: 'playing',
    })
      .populate({ path: 'groupA', populate: { path: 'members' } })
      .populate({ path: 'groupB', populate: { path: 'members' } })
      .lean<MatchDto | null>();

    return {
      reunion: toReunionSummaryDto(reunion),
      bench: bench
        ? { players: bench.players.map(toPlayerDto) }
        : { players: [] },
      groups: groups.map(toUserGroupDto),
      queue: queue
        ? { groups: queue.groups.map(toUserGroupDto) }
        : { groups: [] },
      activeMatch: activeMatch ? toMatchDto(activeMatch) : null,
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
  const parsed = ReunionIdSchema.parse({ reunionId });
  const user = await getCurrentBackendUser();
  return leaveReunionById(parsed.reunionId, user._id);
}

export async function ensureUserInReunion(reunionId: string) {
  const parsed = ReunionIdSchema.parse({ reunionId });
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();

    const isInGroup = await Group.exists({
      reunion: parsed.reunionId,
      members: user._id,
    });
    if (isInGroup) return;

    const bench = await Bench.findOne({ reunion: parsed.reunionId });
    if (!bench) return;

    const isPlayerInBench = bench.players.some(
      (p: { toString: () => string }) => p.toString() === user._id.toString(),
    );
    if (!isPlayerInBench) {
      bench.players.push(user._id);
      await bench.save();
    }
  } catch (error) {
    console.error('Error ensuring user in reunion:', error);
  }
}

export async function kickPlayer(reunionId: string, targetUserId: string) {
  const parsed = ReunionIdSchema.parse({ reunionId });
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();

    const reunion = await Reunion.findById(parsed.reunionId);
    if (!reunion || reunion.admin.toString() !== user._id.toString()) {
      throw new Error('Unauthorized: Only admins can kick players');
    }

    await leaveReunionById(parsed.reunionId, targetUserId);
  } catch (error) {
    console.error('Error kicking player:', error);
    throw error;
  }
}
