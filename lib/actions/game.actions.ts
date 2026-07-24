'use server';

import { connectToDatabase } from '@/lib/database';
import { getCurrentBackendUser } from '@/lib/auth';
import Bench from '@/lib/models/bench.model';
import Group from '@/lib/models/group.model';
import Queue from '@/lib/models/queue.model';
import Match from '@/lib/models/match.model';
import User from '@/lib/models/user.model';
import Reunion from '@/lib/models/reunion.model';
import {
  CreateGroupSchema,
  StartMatchSchema,
  FinishMatchSchema,
  LeaveQueueSchema,
} from '@/lib/validation';

async function requireReunionAdmin(reunionId: string) {
  const user = await getCurrentBackendUser();
  const reunion = await Reunion.findById(reunionId);
  if (!reunion) throw new Error('Reunion not found');
  if (reunion.admin.toString() !== user._id.toString()) {
    throw new Error('Unauthorized: Only the admin can perform this action');
  }
  return user;
}

export async function createGroup(reunionId: string, playerIds: string[]) {
  const parsed = CreateGroupSchema.parse({ reunionId, playerIds });
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();

    const bench = await Bench.findOne({ reunion: parsed.reunionId });
    if (!bench) throw new Error('Bench not found');

    const areAllOnBench = parsed.playerIds.every((pid) =>
      bench.players.some((bp: { toString: () => string }) => bp.toString() === pid),
    );
    if (!areAllOnBench) {
      throw new Error('Some players are no longer on the bench.');
    }

    const isUserInPlayers = parsed.playerIds.includes(user._id.toString());
    if (!isUserInPlayers) {
      throw new Error('You must be one of the players in the group');
    }

    const players = await User.find({ _id: { $in: parsed.playerIds } }).lean();
    const generatedName = players.map((p) => p.username).join(' & ');

    bench.players = bench.players.filter(
      (p: { toString: () => string }) => !parsed.playerIds.includes(p.toString()),
    );
    await bench.save();

    const group = await Group.create({
      reunion: parsed.reunionId,
      name: generatedName || 'New Group',
      members: parsed.playerIds,
    });

    const queue = await Queue.findOne({ reunion: parsed.reunionId });
    if (queue && !queue.groups.includes(group._id)) {
      queue.groups.push(group._id);
      await queue.save();
    }

    const populatedGroup = await Group.findById(group._id)
      .populate('members')
      .lean();
    return {
      _id: populatedGroup!._id.toString(),
      name: populatedGroup!.name,
      members: populatedGroup!.members.map((member: { _id: { toString: () => string }; clerkId: string; email: string; username: string; photo: string }) => ({
        _id: member._id.toString(),
        clerkId: member.clerkId,
        email: member.email,
        username: member.username,
        photo: member.photo,
      })),
    };
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
}

export async function startMatch(reunionId: string) {
  const parsed = StartMatchSchema.parse({ reunionId });
  await requireReunionAdmin(parsed.reunionId);

  try {
    await connectToDatabase();

    const activeMatch = await Match.findOne({
      reunion: parsed.reunionId,
      status: 'playing',
    });
    if (activeMatch) throw new Error('Match already in progress');

    const queue = await Queue.findOne({ reunion: parsed.reunionId });
    if (!queue || queue.groups.length < 2)
      throw new Error('Not enough groups in queue to start');

    const groupA = queue.groups.shift();
    const groupB = queue.groups.shift();
    await queue.save();

    const match = await Match.create({
      reunion: parsed.reunionId,
      groupA,
      groupB,
      status: 'playing',
    });

    const populatedMatch = await Match.findById(match._id)
      .populate({ path: 'groupA', populate: { path: 'members' } })
      .populate({ path: 'groupB', populate: { path: 'members' } })
      .lean();

    return {
      _id: populatedMatch!._id.toString(),
      groupA: {
        _id: populatedMatch!.groupA._id.toString(),
        name: populatedMatch!.groupA.name,
        members: populatedMatch!.groupA.members.map((member: { _id: { toString: () => string }; clerkId: string; email: string; username: string; photo: string }) => ({
          _id: member._id.toString(),
          clerkId: member.clerkId,
          email: member.email,
          username: member.username,
          photo: member.photo,
        })),
      },
      groupB: {
        _id: populatedMatch!.groupB._id.toString(),
        name: populatedMatch!.groupB.name,
        members: populatedMatch!.groupB.members.map((member: { _id: { toString: () => string }; clerkId: string; email: string; username: string; photo: string }) => ({
          _id: member._id.toString(),
          clerkId: member.clerkId,
          email: member.email,
          username: member.username,
          photo: member.photo,
        })),
      },
      status: populatedMatch!.status,
      winner: populatedMatch!.winner?.toString(),
    };
  } catch (error) {
    console.error('Error starting match:', error);
    throw error;
  }
}

export async function finishMatch(matchId: string, winnerGroupId: string) {
  const parsed = FinishMatchSchema.parse({ matchId, winnerGroupId });
  await getCurrentBackendUser();

  try {
    await connectToDatabase();

    const match = await Match.findById(parsed.matchId);
    if (!match) throw new Error('Match not found');
    if (match.status === 'finished') throw new Error('Match already finished');

    const isValidGroup =
      match.groupA.toString() === parsed.winnerGroupId ||
      match.groupB.toString() === parsed.winnerGroupId;
    if (!isValidGroup) throw new Error('Winner must be one of the match groups');

    match.status = 'finished';
    match.winner = parsed.winnerGroupId;
    match.endedAt = new Date();
    await match.save();

    const loserGroupId =
      match.groupA.toString() === parsed.winnerGroupId ? match.groupB : match.groupA;

    const queue = await Queue.findOne({ reunion: match.reunion });
    queue.groups.push(loserGroupId);

    if (queue.groups.length > 0) {
      const nextOpponent = queue.groups.shift()!;
      await Match.create({
        reunion: match.reunion,
        groupA: parsed.winnerGroupId,
        groupB: nextOpponent,
        status: 'playing',
      });
      await queue.save();
    } else {
      queue.groups.unshift(parsed.winnerGroupId);
      await queue.save();
    }
  } catch (error) {
    console.error('Error finishing match:', error);
    throw error;
  }
}

export async function leaveQueue(reunionId: string, groupId: string) {
  const parsed = LeaveQueueSchema.parse({ reunionId, groupId });
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();

    const group = await Group.findById(parsed.groupId);
    if (!group) throw new Error('Group not found');

    const isMember = group.members.some(
      (m: { toString: () => string }) => m.toString() === user._id.toString(),
    );
    if (!isMember) throw new Error('Unauthorized: You are not a member of this group');

    const queue = await Queue.findOne({ reunion: parsed.reunionId });
    if (queue) {
      queue.groups = queue.groups.filter((g: { toString: () => string }) => g.toString() !== parsed.groupId);
      await queue.save();
    }

    const bench = await Bench.findOne({ reunion: parsed.reunionId });
    if (bench) {
      group.members.forEach((memberId: { toString: () => string }) => {
        const isAlreadyOnBench = bench.players.some((p: { toString: () => string }) => p.toString() === memberId.toString());
        if (!isAlreadyOnBench) {
          bench.players.push(memberId);
        }
      });
      await bench.save();
    }

    await Group.findByIdAndDelete(parsed.groupId);
  } catch (error) {
    console.error('Error leaving queue:', error);
    throw error;
  }
}
