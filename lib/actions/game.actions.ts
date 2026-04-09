'use server';

import { connectToDatabase } from '@/lib/database';
import Bench from '@/lib/models/bench.model';
import Group from '@/lib/models/group.model';
import Queue from '@/lib/models/queue.model';
import Match from '@/lib/models/match.model';
import User from '@/lib/models/user.model';

export async function createGroup(reunionId: string, playerIds: string[]) {
  try {
    await connectToDatabase();

    const players = await User.find({ _id: { $in: playerIds } }).lean();
    const generatedName = players.map((p) => p.username).join(' & ');

    const bench = await Bench.findOne({ reunion: reunionId });
    if (bench) {
      // Optional backend safety check: Are they actually on the bench?
      const areAllOnBench = playerIds.every((pid) =>
        bench.players.some((bp: any) => bp.toString() === pid),
      );
      if (!areAllOnBench) {
        throw new Error('Some players are no longer on the bench. They might already be in the queue or a match.');
      }

      bench.players = bench.players.filter(
        (p: { toString: () => string }) => !playerIds.includes(p.toString()),
      );
      await bench.save();
    }

    const group = await Group.create({
      reunion: reunionId,
      name: generatedName || 'New Group',
      members: playerIds,
    });

    const queue = await Queue.findOne({ reunion: reunionId });
    if (queue && !queue.groups.includes(group._id)) {
      queue.groups.push(group._id);
      await queue.save();
    }

    // Populate the group to get member details
    const populatedGroup = await Group.findById(group._id)
      .populate('members')
      .lean();
    return {
      _id: populatedGroup!._id.toString(),
      name: populatedGroup!.name,
      members: populatedGroup!.members.map((member: any) => ({
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

export async function addGroupToQueue(reunionId: string, groupId: string) {
  try {
    await connectToDatabase();
    const queue = await Queue.findOne({ reunion: reunionId });

    // Check if group is already in queue or playing?
    // Simplifying: just push.
    if (!queue.groups.includes(groupId)) {
      queue.groups.push(groupId);
      await queue.save();
    }
  } catch (error) {
    console.error('Error queueing group:', error);
    throw error;
  }
}

export async function startMatch(reunionId: string) {
  try {
    await connectToDatabase();

    const activeMatch = await Match.findOne({
      reunion: reunionId,
      status: 'playing',
    });
    if (activeMatch) throw new Error('Match already in progress');

    const queue = await Queue.findOne({ reunion: reunionId });
    if (!queue || queue.groups.length < 2)
      throw new Error('Not enough groups in queue to start');

    const groupA = queue.groups.shift();
    const groupB = queue.groups.shift();
    await queue.save();

    const match = await Match.create({
      reunion: reunionId,
      groupA,
      groupB,
      status: 'playing',
    });

    // Populate the match to get group details
    const populatedMatch = await Match.findById(match._id)
      .populate({ path: 'groupA', populate: { path: 'members' } })
      .populate({ path: 'groupB', populate: { path: 'members' } })
      .lean();

    return {
      _id: populatedMatch!._id.toString(),
      groupA: {
        _id: populatedMatch!.groupA._id.toString(),
        name: populatedMatch!.groupA.name,
        members: populatedMatch!.groupA.members.map((member: any) => ({
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
        members: populatedMatch!.groupB.members.map((member: any) => ({
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
  try {
    await connectToDatabase();

    const match = await Match.findById(matchId);
    if (!match) throw new Error('Match not found');

    match.status = 'finished';
    match.winner = winnerGroupId;
    match.endedAt = new Date();
    await match.save();

    // Identify loser
    const loserGroupId =
      match.groupA.toString() === winnerGroupId ? match.groupB : match.groupA;

    // 1. Loser goes to Queue end
    const queue = await Queue.findOne({ reunion: match.reunion });
    queue.groups.push(loserGroupId);

    // 2. Winner stays? Draw next opponent.
    // Check if queue has next opponent
    if (queue.groups.length > 0) {
      // Usually, winner stays as 'GroupA' (King), Next is 'GroupB'.
      // But wait, queue.groups includes the loser we just pushed?
      // If we want "Next in line" to play, we should shift from HEAD.
      // The loser we just pushed is at TAIL.

      // However, we must ensure we don't pick the loser immediately if they are the only ones.
      // If queue has only the loser, then they play again immediately.

      const nextOpponent = queue.groups.shift()!;

      // Create new match
      await Match.create({
        reunion: match.reunion,
        groupA: winnerGroupId, // Winner stays
        groupB: nextOpponent, // Challenger
        status: 'playing',
      });
      await queue.save();
    } else {
      queue.groups.unshift(winnerGroupId);
      await queue.save();
    }
  } catch (error) {
    console.error('Error finishing match:', error);
    throw error;
  }
}

export async function leaveQueue(reunionId: string, groupId: string) {
  try {
    await connectToDatabase();

    // Remove group from queue
    const queue = await Queue.findOne({ reunion: reunionId });
    if (queue) {
      queue.groups = queue.groups.filter((g: { toString: () => string }) => g.toString() !== groupId);
      await queue.save();
    }

    // Get group members
    const group = await Group.findById(groupId);
    if (!group) return;

    // Put members back to bench
    const bench = await Bench.findOne({ reunion: reunionId });
    if (bench) {
      group.members.forEach((memberId: { toString: () => string }) => {
        const isAlreadyOnBench = bench.players.some((p: { toString: () => string }) => p.toString() === memberId.toString());
        if (!isAlreadyOnBench) {
          bench.players.push(memberId);
        }
      });
      await bench.save();
    }

    // Delete the group
    await Group.findByIdAndDelete(groupId);

  } catch (error) {
    console.error('Error leaving queue:', error);
    throw error;
  }
}
