"use server";

import { connectToDatabase } from "@/lib/database";
import Reunion from "@/lib/models/reunion.model";
import Bench from "@/lib/models/bench.model";
import Queue from "@/lib/models/queue.model";
import Group from "@/lib/models/group.model";
import Match from "@/lib/models/match.model";
import { syncUser } from "./user.actions";

// Generate a random 6-character code
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface ClerkUser {
    id: string;
    email_addresses: { email_address: string }[];
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    image_url: string;
}


export async function createReunion(clerkUser: ClerkUser, name: string) {
  try {
    await connectToDatabase();
    
    // 1. Ensure user is synced
    const user = await syncUser(clerkUser);

    // 2. Create Reunion
    const code = generateCode();
    const reunion = await Reunion.create({
      name,
      code,
      admin: user._id,
    });

    // 3. Create initial Bench (with admin) and Queue (empty)
    await Bench.create({ reunion: reunion._id, players: [user._id] });
    await Queue.create({ reunion: reunion._id, groups: [] });

    // 4. Return the reunion ID (string)
    return JSON.parse(JSON.stringify(reunion));
  } catch (error) {
    console.error("Error creating reunion:", error);
    throw new Error("Failed to create reunion");
  }
}

export async function joinReunion(clerkUser: ClerkUser, code: string) {
  try {
    await connectToDatabase();
    
    const user = await syncUser(clerkUser);
    const reunion = await Reunion.findOne({ code, isActive: true });

    if (!reunion) {
      throw new Error("Reunion not found or inactive");
    }

    // Check if user is already in a group
    const isInGroup = await Group.exists({ reunion: reunion._id, members: user._id });
    if (isInGroup) return JSON.parse(JSON.stringify(reunion));

    const bench = await Bench.findOne({ reunion: reunion._id });
    
    // Check if user is already in bench
    const isPlayerInBench = bench.players.some((p: { toString: () => string }) => p.toString() === user._id.toString());
    if (!isPlayerInBench) {
        bench.players.push(user._id);
        await bench.save();
    }

    return JSON.parse(JSON.stringify(reunion));
  } catch (error) {
    console.error("Error joining reunion:", error);
    throw error;
  }
}

export async function getReunionDetails(reunionId: string) {
    try {
        await connectToDatabase();
        
        // Fetch Reunion info
        const reunion = await Reunion.findById(reunionId).populate('admin');
        if(!reunion) return null;

        // Fetch Bench with players populated
        const bench = await Bench.findOne({ reunion: reunionId }).populate('players');
        
        // Fetch Groups
        const groups = await Group.find({ reunion: reunionId }).populate('members');

        // Fetch Queue with groups populated (and their members)
        const queue = await Queue.findOne({ reunion: reunionId }).populate({
          path: 'groups',
          populate: { path: 'members' }
        });

        // Fetch Current Match (Active)
        const activeMatch = await Match.findOne({ reunion: reunionId, status: 'playing' })
            .populate({ path: 'groupA', populate: { path: 'members' }})
            .populate({ path: 'groupB', populate: { path: 'members' }});

        return {
            reunion: JSON.parse(JSON.stringify(reunion)),
            bench: JSON.parse(JSON.stringify(bench)),
            groups: JSON.parse(JSON.stringify(groups)),
            queue: JSON.parse(JSON.stringify(queue)),
            activeMatch: JSON.parse(JSON.stringify(activeMatch)),
        };

    } catch (error) {
        console.error("Error fetching reunion details:", error);
        return null;
    }
}

export async function leaveReunion(reunionId: string, userId: string) {
    try {
        await connectToDatabase();
        
        // 1. Remove from Bench
        const bench = await Bench.findOne({ reunion: reunionId });
        if (bench) {
            bench.players = bench.players.filter((p: { toString: () => string }) => p.toString() !== userId);
            await bench.save();
        }

        // 2. Remove from Groups (and handle empty groups)
        const groups = await Group.find({ reunion: reunionId, members: userId });
        for (const group of groups) {
            group.members = group.members.filter((m: { toString: () => string }) => m.toString() !== userId);
            if (group.members.length === 0) {
                // Remove from Queue if it was there
                const queue = await Queue.findOne({ reunion: reunionId });
                if (queue) {
                    queue.groups = queue.groups.filter((g: { toString: () => string }) => g.toString() !== group._id.toString());
                    await queue.save();
                }
                // Check if it was in an active match
                const match = await Match.findOne({ reunion: reunionId, status: 'playing', $or: [{groupA: group._id}, {groupB: group._id}] });
                if (match) {
                    match.status = 'finished'; // Or "cancelled" if we had that status
                    await match.save();
                }

                await Group.findByIdAndDelete(group._id);
            } else {
                await group.save();
            }
        }
    } catch (error) {
        console.error("Error leaving reunion:", error);
        throw error;
    }
}

export async function ensureUserInReunion(reunionId: string, userId: string) {
    try {
        await connectToDatabase();

        // 1. Check if user is already in any group of this reunion
        const isInGroup = await Group.exists({ reunion: reunionId, members: userId });
        if (isInGroup) return; // User is already participating via a group

        // 2. Check if user is already in the bench
        const bench = await Bench.findOne({ reunion: reunionId });
        if (!bench) return;

        const isPlayerInBench = bench.players.some((p: { toString: () => string }) => p.toString() === userId.toString());
        if (!isPlayerInBench) {
            bench.players.push(userId);
            await bench.save();
        }
    } catch (error) {
        console.error("Error ensuring user in reunion:", error);
    }
}

export async function kickPlayer(reunionId: string, adminId: string, targetUserId: string) {
    try {
        await connectToDatabase();
        
        // 1. Verify admin
        const reunion = await Reunion.findById(reunionId);
        if (!reunion || reunion.admin.toString() !== adminId) {
            throw new Error("Unauthorized: Only admins can kick players");
        }

        // 2. Reuse leave logic
        await leaveReunion(reunionId, targetUserId);
    } catch (error) {
        console.error("Error kicking player:", error);
        throw error;
    }
}

