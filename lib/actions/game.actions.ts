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

    return group.toObject();
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

    return match.toObject();
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
