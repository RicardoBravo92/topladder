"use server";

import { connectToDatabase } from "@/lib/database";
import Friend from "@/lib/models/friend.model";
import User from "@/lib/models/user.model";
import ReunionInvite from "@/lib/models/reunion-invite.model";

export async function sendFriendRequest(requesterId: string, recipientEmail: string) {
  try {
    await connectToDatabase();
    
    // Find recipient by email
    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) throw new Error("User not found");
    if (recipient._id.toString() === requesterId) throw new Error("You cannot add yourself");

    // Check if request already exists
    const existing = await Friend.findOne({
        $or: [
            { requester: requesterId, recipient: recipient._id },
            { requester: recipient._id, recipient: requesterId }
        ]
    });
    if (existing) throw new Error("Friendship already exists or request pending");

    await Friend.create({ requester: requesterId, recipient: recipient._id });
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
}

export async function sendFriendRequestById(requesterId: string, recipientId: string) {
    try {
      await connectToDatabase();
      
      const existing = await Friend.findOne({
          $or: [
              { requester: requesterId, recipient: recipientId },
              { requester: recipientId, recipient: requesterId }
          ]
      });
      if (existing) throw new Error("Friendship already exists or request pending");
  
      await Friend.create({ requester: requesterId, recipient: recipientId });
    } catch (error) {
      console.error("Error sending friend request by ID:", error);
      throw error;
    }
}

export async function getFriendshipStatuses(userId: string, targetIds: string[]) {
    try {
        await connectToDatabase();
        const friendships = await Friend.find({
            $or: [
                { requester: userId, recipient: { $in: targetIds } },
                { recipient: userId, requester: { $in: targetIds } }
            ]
        });

        const statusMap: Record<string, string> = {};
        friendships.forEach(f => {
            const otherId = f.requester.toString() === userId ? f.recipient.toString() : f.requester.toString();
            statusMap[otherId] = f.status;
        });
        return statusMap;
    } catch (error) {
        console.error("Error getting friendship statuses:", error);
        return {};
    }
}

export async function getFriends(userId: string) {
  try {
    await connectToDatabase();
    const friendships = await Friend.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted"
    }).populate("requester recipient");

    return friendships.map(f => {
      const friend = f.requester._id.toString() === userId ? f.recipient : f.requester;
      return JSON.parse(JSON.stringify(friend));
    });
  } catch (error) {
    console.error("Error getting friends:", error);
    return [];
  }
}

export async function getPendingRequests(userId: string) {
    try {
        await connectToDatabase();
        const requests = await Friend.find({ recipient: userId, status: "pending" }).populate("requester");
        return JSON.parse(JSON.stringify(requests));
    } catch (error) {
        console.error("Error getting pending requests:", error);
        return [];
    }
}

export async function respondToFriendRequest(requestId: string, status: "accepted" | "rejected") {
    try {
        await connectToDatabase();
        const request = await Friend.findById(requestId);
        if (!request) throw new Error("Request not found");
        
        request.status = status;
        await request.save();
    } catch (error) {
        console.error("Error responding to friend request:", error);
        throw error;
    }
}

export async function sendReunionInvite(reunionId: string, inviterId: string, recipientId: string) {
    try {
        await connectToDatabase();
        
        // Check if already invited
        const existing = await ReunionInvite.findOne({ reunion: reunionId, recipient: recipientId, status: "pending" });
        if (existing) throw new Error("Invite already pending");

        await ReunionInvite.create({
            reunion: reunionId,
            inviter: inviterId,
            recipient: recipientId
        });
    } catch (error) {
        console.error("Error sending reunion invite:", error);
        throw error;
    }
}

export async function getMyReunionInvites(userId: string) {
    try {
        await connectToDatabase();
        const invites = await ReunionInvite.find({ recipient: userId, status: "pending" })
            .populate("reunion inviter");
        return JSON.parse(JSON.stringify(invites));
    } catch (error) {
        console.error("Error getting reunion invites:", error);
        return [];
    }
}

export async function respondToReunionInvite(inviteId: string, status: "accepted" | "rejected") {
    try {
        await connectToDatabase();
        const invite = await ReunionInvite.findById(inviteId);
        if (!invite) throw new Error("Invite not found");
        
        invite.status = status;
        await invite.save();
        return invite.reunion;
    } catch (error) {
        console.error("Error responding to reunion invite:", error);
        throw error;
    }
}

