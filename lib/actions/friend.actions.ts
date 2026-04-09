'use server';

import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/database';
import Friend from '@/lib/models/friend.model';
import User from '@/lib/models/user.model';
import ReunionInvite from '@/lib/models/reunion-invite.model';
import { syncUser } from './user.actions';

async function getCurrentBackendUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('Authentication required');
  return syncUser({
    id: clerkUser.id,
    email_addresses: clerkUser.emailAddresses.map((e) => ({
      email_address: e.emailAddress,
    })),
    username: clerkUser.username,
    first_name: clerkUser.firstName,
    last_name: clerkUser.lastName,
    image_url: clerkUser.imageUrl,
  });
}

export async function sendFriendRequest(recipientIdentifier: string) {
  const backendUser = await getCurrentBackendUser();
  try {
    await connectToDatabase();

    const recipient = await User.findOne({
      $or: [{ email: recipientIdentifier }, { username: recipientIdentifier }],
    });
    if (!recipient) throw new Error('User not found by email or username');
    if (recipient._id.toString() === backendUser._id)
      throw new Error('You cannot add yourself');

    const existing = await Friend.findOne({
      $or: [
        { requester: backendUser._id, recipient: recipient._id },
        { requester: recipient._id, recipient: backendUser._id },
      ],
    });
    if (existing)
      throw new Error('Friendship already exists or request pending');

    await Friend.create({
      requester: backendUser._id,
      recipient: recipient._id,
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
}

export async function sendFriendRequestById(recipientId: string) {
  const currentUser = await getCurrentBackendUser();
  try {
    await connectToDatabase();

    const existing = await Friend.findOne({
      $or: [
        { requester: currentUser._id, recipient: recipientId },
        { requester: recipientId, recipient: currentUser._id },
      ],
    });
    if (existing)
      throw new Error('Friendship already exists or request pending');

    await Friend.create({ requester: currentUser._id, recipient: recipientId });
  } catch (error) {
    console.error('Error sending friend request by ID:', error);
    throw error;
  }
}

export async function getFriendshipStatuses(
  userId: string,
  targetIds: string[],
) {
  try {
    await connectToDatabase();
    const friendships = await Friend.find({
      $or: [
        { requester: userId, recipient: { $in: targetIds } },
        { recipient: userId, requester: { $in: targetIds } },
      ],
    });

    const statusMap: Record<string, string> = {};
    friendships.forEach((f) => {
      const otherId =
        f.requester.toString() === userId
          ? f.recipient.toString()
          : f.requester.toString();
      statusMap[otherId] = f.status;
    });
    return statusMap;
  } catch (error) {
    console.error('Error getting friendship statuses:', error);
    return {};
  }
}

export async function getFriends(userId: string) {
  try {
    await connectToDatabase();
    const friendships = await Friend.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    })
      .populate('requester recipient')
      .lean<
        {
          requester: { _id: string; username: string; photo: string };
          recipient: { _id: string; username: string; photo: string };
        }[]
      >();

    return friendships.map((f) => {
      const friend =
        f.requester._id.toString() === userId ? f.recipient : f.requester;
      return {
        _id: friend._id.toString(),
        username: friend.username,
        photo: friend.photo,
      };
    });
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
}

export async function getPendingRequests(userId: string) {
  try {
    await connectToDatabase();
    const requests = await Friend.find({ recipient: userId, status: 'pending' })
      .populate('requester')
      .lean();
    return requests.map((request) => ({
      _id: request._id.toString(),
      requester: {
        _id: request.requester._id.toString(),
        username: request.requester.username,
        photo: request.requester.photo,
      },
    }));
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return [];
  }
}

export async function respondToFriendRequest(
  requestId: string,
  status: 'accepted' | 'rejected',
) {
  try {
    await connectToDatabase();
    const request = await Friend.findById(requestId);
    if (!request) throw new Error('Request not found');

    request.status = status;
    await request.save();
  } catch (error) {
    console.error('Error responding to friend request:', error);
    throw error;
  }
}

export async function sendReunionInvite(
  reunionId: string,
  recipientId: string,
) {
  const currentUser = await getCurrentBackendUser();
  try {
    await connectToDatabase();

    const existing = await ReunionInvite.findOne({
      reunion: reunionId,
      recipient: recipientId,
      status: 'pending',
    });
    if (existing) throw new Error('Invite already pending');

    await ReunionInvite.create({
      reunion: reunionId,
      inviter: currentUser._id,
      recipient: recipientId,
    });
  } catch (error) {
    console.error('Error sending reunion invite:', error);
    throw error;
  }
}

export async function getMyReunionInvites(userId: string) {
  try {
    await connectToDatabase();
    const invites = await ReunionInvite.find({
      recipient: userId,
      status: 'pending',
    })
      .populate('reunion inviter')
      .lean();
    return invites.map((invite) => ({
      _id: invite._id.toString(),
      inviter: {
        _id: invite.inviter._id.toString(),
        username: invite.inviter.username,
        photo: invite.inviter.photo,
      },
      reunion: {
        _id: invite.reunion._id.toString(),
        name: invite.reunion.name,
      },
    }));
  } catch (error) {
    console.error('Error getting reunion invites:', error);
    return [];
  }
}

export async function respondToReunionInvite(
  inviteId: string,
  status: 'accepted' | 'rejected',
) {
  try {
    await connectToDatabase();
    const invite = await ReunionInvite.findById(inviteId);
    if (!invite) throw new Error('Invite not found');

    invite.status = status;
    await invite.save();
    return invite.reunion.toString();
  } catch (error) {
    console.error('Error responding to reunion invite:', error);
    throw error;
  }
}
