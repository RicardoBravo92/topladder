import { describe, it, expect } from 'vitest';
import {
  CreateReunionSchema,
  JoinReunionSchema,
  ReunionIdSchema,
  CreateGroupSchema,
  StartMatchSchema,
  FinishMatchSchema,
  LeaveQueueSchema,
  SendFriendRequestSchema,
  FriendRequestIdSchema,
  SendReunionInviteSchema,
  ReunionInviteResponseSchema,
  GetFriendshipStatusesSchema,
  GetFriendsSchema,
} from '@/lib/validation';

const VALID_ID = '507f1f77bcf86cd799439011';

describe('CreateReunionSchema', () => {
  it('accepts a valid individual reunion', () => {
    const result = CreateReunionSchema.parse({
      name: 'Monday Night Pickup',
      settings: { gameMode: 'individual' },
    });
    expect(result.name).toBe('Monday Night Pickup');
    expect(result.settings.gameMode).toBe('individual');
  });

  it('accepts a valid group reunion with settings', () => {
    const result = CreateReunionSchema.parse({
      name: 'Teams',
      settings: {
        gameMode: 'group',
        groupSize: 4,
        playersAtOnce: 2,
        playersContinue: 1,
      },
    });
    expect(result.settings.groupSize).toBe(4);
  });

  it('rejects an empty name', () => {
    expect(() =>
      CreateReunionSchema.parse({
        name: '',
        settings: { gameMode: 'individual' },
      }),
    ).toThrow();
  });

  it('rejects a name longer than 50 chars', () => {
    expect(() =>
      CreateReunionSchema.parse({
        name: 'a'.repeat(51),
        settings: { gameMode: 'individual' },
      }),
    ).toThrow();
  });

  it('rejects an invalid gameMode', () => {
    expect(() =>
      CreateReunionSchema.parse({
        name: 'Test',
        settings: { gameMode: 'solo' },
      }),
    ).toThrow();
  });

  it('rejects groupSize below 2', () => {
    expect(() =>
      CreateReunionSchema.parse({
        name: 'Test',
        settings: { gameMode: 'group', groupSize: 1 },
      }),
    ).toThrow();
  });

  it('rejects a non-integer playersAtOnce', () => {
    expect(() =>
      CreateReunionSchema.parse({
        name: 'Test',
        settings: { gameMode: 'individual', playersAtOnce: 2.5 },
      }),
    ).toThrow();
  });
});

describe('JoinReunionSchema', () => {
  it('accepts a 6-character uppercase code', () => {
    const result = JoinReunionSchema.parse({ code: 'ABC123' });
    expect(result.code).toBe('ABC123');
  });

  it('rejects a code with wrong length', () => {
    expect(() => JoinReunionSchema.parse({ code: 'AB12' })).toThrow();
    expect(() => JoinReunionSchema.parse({ code: 'ABCDEF1' })).toThrow();
  });

  it('rejects a code with lowercase or symbols', () => {
    expect(() => JoinReunionSchema.parse({ code: 'abc123' })).toThrow();
    expect(() => JoinReunionSchema.parse({ code: 'AB$123' })).toThrow();
  });
});

describe('ReunionIdSchema', () => {
  it('accepts a valid Mongo ObjectId', () => {
    expect(ReunionIdSchema.parse({ reunionId: VALID_ID }).reunionId).toBe(
      VALID_ID,
    );
  });

  it('rejects a malformed ObjectId', () => {
    expect(() => ReunionIdSchema.parse({ reunionId: 'not-an-id' })).toThrow();
  });
});

describe('CreateGroupSchema', () => {
  it('accepts a single player', () => {
    const result = CreateGroupSchema.parse({ reunionId: VALID_ID, playerIds: [VALID_ID] });
    expect(result.playerIds).toHaveLength(1);
  });

  it('rejects an empty player list', () => {
    expect(() =>
      CreateGroupSchema.parse({ reunionId: VALID_ID, playerIds: [] }),
    ).toThrow();
  });

  it('rejects more than 10 players', () => {
    const ids = Array.from({ length: 11 }, () => VALID_ID);
    expect(() =>
      CreateGroupSchema.parse({ reunionId: VALID_ID, playerIds: ids }),
    ).toThrow();
  });

  it('rejects a malformed player id', () => {
    expect(() =>
      CreateGroupSchema.parse({ reunionId: VALID_ID, playerIds: ['bogus'] }),
    ).toThrow();
  });
});

describe('StartMatchSchema / FinishMatchSchema / LeaveQueueSchema', () => {
  it('accepts a valid start match payload', () => {
    expect(StartMatchSchema.parse({ reunionId: VALID_ID })).toBeDefined();
  });

  it('accepts a valid finish match payload', () => {
    expect(
      FinishMatchSchema.parse({
        matchId: VALID_ID,
        winnerGroupId: VALID_ID,
      }),
    ).toBeDefined();
  });

  it('accepts a valid leave queue payload', () => {
    expect(
      LeaveQueueSchema.parse({
        reunionId: VALID_ID,
        groupId: VALID_ID,
      }),
    ).toBeDefined();
  });

  it('rejects a finish match without winner', () => {
    expect(() =>
      FinishMatchSchema.parse({ matchId: VALID_ID }),
    ).toThrow();
  });
});

describe('Friend request schemas', () => {
  it('accepts an email identifier', () => {
    const result = SendFriendRequestSchema.parse({
      recipientIdentifier: 'player@example.com',
    });
    expect(result.recipientIdentifier).toBe('player@example.com');
  });

  it('trims whitespace from identifiers', () => {
    const result = SendFriendRequestSchema.parse({
      recipientIdentifier: '  someone  ',
    });
    expect(result.recipientIdentifier).toBe('someone');
  });

  it('rejects an empty identifier', () => {
    expect(() =>
      SendFriendRequestSchema.parse({ recipientIdentifier: '' }),
    ).toThrow();
  });

  it('accepts a valid friend request response', () => {
    expect(
      FriendRequestIdSchema.parse({ requestId: VALID_ID, status: 'accepted' }),
    ).toBeDefined();
  });

  it('rejects an unknown response status', () => {
    expect(() =>
      FriendRequestIdSchema.parse({ requestId: VALID_ID, status: 'maybe' }),
    ).toThrow();
  });
});

describe('Reunion invite schemas', () => {
  it('accepts a valid invite payload', () => {
    expect(
      SendReunionInviteSchema.parse({
        reunionId: VALID_ID,
        recipientId: VALID_ID,
      }),
    ).toBeDefined();
  });

  it('rejects an invite response with an invalid status', () => {
    expect(() =>
      ReunionInviteResponseSchema.parse({
        inviteId: VALID_ID,
        status: 'declined',
      }),
    ).toThrow();
  });
});

describe('Friendship status schemas', () => {
  it('accepts a list of target ids', () => {
    const result = GetFriendshipStatusesSchema.parse({
      targetIds: [VALID_ID, VALID_ID],
    });
    expect(result.targetIds).toHaveLength(2);
  });

  it('rejects an empty target list', () => {
    expect(() =>
      GetFriendshipStatusesSchema.parse({ targetIds: [] }),
    ).toThrow();
  });

  it('accepts a valid get friends payload', () => {
    expect(GetFriendsSchema.parse({ userId: VALID_ID })).toBeDefined();
  });
});