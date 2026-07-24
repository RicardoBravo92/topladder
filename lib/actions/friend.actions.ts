'use server';

import { connectToDatabase } from '@/lib/database';
import { getCurrentBackendUser } from '@/lib/auth';
import Friend from '@/lib/models/friend.model';
import User from '@/lib/models/user.model';
import ReunionInvite from '@/lib/models/reunion-invite.model';
import {
  SendFriendRequestSchema,
  FriendRequestIdSchema,
  SendReunionInviteSchema,
  ReunionInviteResponseSchema,
  GetFriendshipStatusesSchema,
  GetFriendsSchema,
} from '@/lib/validation';

export async function sendFriendRequest(recipientIdentifier: string) {
  const parsed = SendFriendRequestSchema.parse({ recipientIdentifier });
  const backendUser = await getCurrentBackendUser();

  try {
    await connectToDatabase();

    const recipient = await User.findOne({
      $or: [{ email: parsed.recipientIdentifier }, { username: parsed.recipientIdentifier }],
    });
    if (!recipient) throw new Error('User not found by email or username');
    if (recipient._id.toString() === backendUser._id.toString())
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
  const parsed = SendFriendRequestSchema.parse({ recipientIdentifier: recipientId });
  const backendUser = await getCurrentBackendUser();

  try {
    await connectToDatabase();

    const existing = await Friend.findOne({
      $or: [
        { requester: backendUser._id, recipient: parsed.recipientIdentifier },
        { requester: parsed.recipientIdentifier, recipient: backendUser._id },
      ],
    });
    if (existing)
      throw new Error('Friendship already exists or request pending');

    await Friend.create({ requester: backendUser._id, recipient: parsed.recipientIdentifier });
  } catch (error) {
    console.error('Error sending friend request by ID:', error);
    throw error;
  }
}

export async function getFriendshipStatuses(
  targetIds: string[],
) {
  const parsed = GetFriendshipStatusesSchema.parse({ targetIds });
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();
    const friendships = await Friend.find({
      $or: [
        { requester: user._id, recipient: { $in: parsed.targetIds } },
        { recipient: user._id, requester: { $in: parsed.targetIds } },
      ],
    });

    const statusMap: Record<string, string> = {};
    friendships.forEach((f) => {
      const otherId =
        f.requester.toString() === user._id.toString()
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

export async function getFriends() {
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();
    const friendships = await Friend.find({
      $or: [{ requester: user._id }, { recipient: user._id }],
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
        f.requester._id.toString() === user._id.toString() ? f.recipient : f.requester;
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

export async function getPendingRequests() {
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();
    const requests = await Friend.find({ recipient: user._id, status: 'pending' })
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
  const parsed = FriendRequestIdSchema.parse({ requestId, status });
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();
    const request = await Friend.findById(parsed.requestId);
    if (!request) throw new Error('Request not found');

    if (request.recipient.toString() !== user._id.toString()) {
      throw new Error('Unauthorized: You can only respond to requests sent to you');
    }

    request.status = parsed.status;
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
  const parsed = SendReunionInviteSchema.parse({ reunionId, recipientId });
  const currentUser = await getCurrentBackendUser();

  try {
    await connectToDatabase();

    const existing = await ReunionInvite.findOne({
      reunion: parsed.reunionId,
      recipient: parsed.recipientId,
      status: 'pending',
    });
    if (existing) throw new Error('Invite already pending');

    await ReunionInvite.create({
      reunion: parsed.reunionId,
      inviter: currentUser._id,
      recipient: parsed.recipientId,
    });
  } catch (error) {
    console.error('Error sending reunion invite:', error);
    throw error;
  }
}

export async function getMyReunionInvites() {
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();
    const invites = await ReunionInvite.find({
      recipient: user._id,
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
  const parsed = ReunionInviteResponseSchema.parse({ inviteId, status });
  const user = await getCurrentBackendUser();

  try {
    await connectToDatabase();
    const invite = await ReunionInvite.findById(parsed.inviteId);
    if (!invite) throw new Error('Invite not found');

    if (invite.recipient.toString() !== user._id.toString()) {
      throw new Error('Unauthorized: You can only respond to your own invites');
    }

    invite.status = parsed.status;
    await invite.save();
    return invite.reunion.toString();
  } catch (error) {
    console.error('Error responding to reunion invite:', error);
    throw error;
  }
}
