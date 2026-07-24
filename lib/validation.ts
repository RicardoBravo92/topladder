import { z } from 'zod';

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

export const CreateReunionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long').trim(),
  settings: z.object({
    gameMode: z.enum(['individual', 'group']),
    groupSize: z.number().int().min(2).max(20).optional(),
    playersAtOnce: z.number().int().min(1).max(50).optional(),
    playersContinue: z.number().int().min(0).max(50).optional(),
  }),
});

export const JoinReunionSchema = z.object({
  code: z.string().length(6, 'Code must be 6 characters').regex(/^[A-Z0-9]+$/, 'Code must be alphanumeric uppercase'),
});

export const ReunionIdSchema = z.object({
  reunionId: mongoId,
});

export const CreateGroupSchema = z.object({
  reunionId: mongoId,
  playerIds: z.array(mongoId).min(1, 'At least one player required').max(10, 'Too many players'),
});

export const StartMatchSchema = z.object({
  reunionId: mongoId,
});

export const FinishMatchSchema = z.object({
  matchId: mongoId,
  winnerGroupId: mongoId,
});

export const LeaveQueueSchema = z.object({
  reunionId: mongoId,
  groupId: mongoId,
});

export const SendFriendRequestSchema = z.object({
  recipientIdentifier: z.string().min(1, 'Identifier required').max(100, 'Identifier too long').trim(),
});

export const FriendRequestIdSchema = z.object({
  requestId: mongoId,
  status: z.enum(['accepted', 'rejected']),
});

export const SendReunionInviteSchema = z.object({
  reunionId: mongoId,
  recipientId: mongoId,
});

export const ReunionInviteResponseSchema = z.object({
  inviteId: mongoId,
  status: z.enum(['accepted', 'rejected']),
});

export const GetFriendshipStatusesSchema = z.object({
  targetIds: z.array(mongoId).min(1).max(50),
});

export const GetFriendsSchema = z.object({
  userId: mongoId,
});
