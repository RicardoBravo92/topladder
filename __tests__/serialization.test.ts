import { describe, it, expect } from 'vitest';
import {
  toPlayerDto,
  toUserGroupDto,
  toMatchDto,
  toReunionSummaryDto,
} from '@/lib/types';

const ID = '507f1f77bcf86cd799439011';

function playerDoc() {
  return {
    _id: { toString: () => ID },
    clerkId: 'clerk_123',
    email: 'player@example.com',
    username: 'john_doe',
    photo: 'https://example.com/photo.jpg',
  };
}

describe('toPlayerDto', () => {
  it('maps a document to a serializable Player', () => {
    const player = toPlayerDto(playerDoc());
    expect(player).toEqual({
      _id: ID,
      clerkId: 'clerk_123',
      email: 'player@example.com',
      username: 'john_doe',
      photo: 'https://example.com/photo.jpg',
    });
  });
});

describe('toUserGroupDto', () => {
  it('maps a group with members', () => {
    const group = toUserGroupDto({
      _id: { toString: () => ID },
      name: 'John & Jane',
      members: [playerDoc()],
    });
    expect(group._id).toBe(ID);
    expect(group.name).toBe('John & Jane');
    expect(group.members[0].username).toBe('john_doe');
  });
});

describe('toMatchDto', () => {
  it('maps an active match with winner', () => {
    const match = toMatchDto({
      _id: { toString: () => ID },
      groupA: {
        _id: { toString: () => ID },
        name: 'Team A',
        members: [playerDoc()],
      },
      groupB: {
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        name: 'Team B',
        members: [],
      },
      status: 'playing',
      winner: { toString: () => '507f1f77bcf86cd799439012' },
    });
    expect(match.status).toBe('playing');
    expect(match.winner).toBe('507f1f77bcf86cd799439012');
    expect(match.groupA.name).toBe('Team A');
  });

  it('omits winner when undefined', () => {
    const match = toMatchDto({
      _id: { toString: () => ID },
      groupA: { _id: { toString: () => ID }, name: 'A', members: [] },
      groupB: { _id: { toString: () => ID }, name: 'B', members: [] },
      status: 'playing',
      winner: undefined,
    });
    expect(match.winner).toBeUndefined();
  });
});

describe('toReunionSummaryDto', () => {
  const baseDoc = {
    _id: { toString: () => ID },
    name: 'Pickup Game',
    code: 'ABC123',
    isActive: true,
    createdAt: { toISOString: () => '2026-01-01T00:00:00.000Z' },
    gameMode: 'group',
    groupSize: 2,
    playersAtOnce: 1,
    playersContinue: 0,
  } as const;

  it('maps a lean document with a populated admin', () => {
    const summary = toReunionSummaryDto({
      ...baseDoc,
      admin: { _id: { toString: () => ID } },
    });
    expect(summary.admin).toEqual({ _id: ID });
    expect(summary.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(summary.code).toBe('ABC123');
  });

  it('maps a document whose admin is a plain ObjectId', () => {
    const summary = toReunionSummaryDto({
      ...baseDoc,
      admin: { toString: () => ID },
    });
    expect(summary.admin).toEqual({ _id: ID });
  });

  it('keeps a createdAt string as-is', () => {
    const summary = toReunionSummaryDto({
      ...baseDoc,
      createdAt: '2026-01-01T00:00:00.000Z',
      admin: { _id: { toString: () => ID } },
    });
    expect(summary.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});