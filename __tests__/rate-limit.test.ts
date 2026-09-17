import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createRateLimiter,
  RateLimitError,
  friendRequestLimiter,
  reunionInviteLimiter,
  createReunionLimiter,
} from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows requests up to the max', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-a')).toBe(true);
  });

  it('throws RateLimitError when exceeding the max', () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
    limiter.check('user-a');
    limiter.check('user-a');
    expect(() => limiter.check('user-a')).toThrow(RateLimitError);
  });

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(limiter.check('user-a')).toBe(true);
    expect(() => limiter.check('user-a')).toThrow(RateLimitError);
    expect(limiter.check('user-b')).toBe(true);
  });

  it('reports a positive retryAfterMs', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    limiter.check('user-a');
    try {
      limiter.check('user-a');
    } catch (error) {
      const rateLimitError = error as RateLimitError;
      expect(rateLimitError.retryAfterMs).toBeGreaterThan(0);
      expect(rateLimitError.message).toMatch(/too many requests/i);
    }
  });

  it('clears the record after the window passes', () => {
    vi.useFakeTimers();
    try {
      const limiter = createRateLimiter({ max: 1, windowMs: 1_000 });
      limiter.check('user-a');
      expect(() => limiter.check('user-a')).toThrow(RateLimitError);
      vi.advanceTimersByTime(1_001);
      expect(limiter.check('user-a')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reset clears a single key', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    limiter.check('user-a');
    limiter.reset('user-a');
    expect(limiter.check('user-a')).toBe(true);
  });

  it('reset without a key clears everything', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    limiter.check('user-a');
    limiter.check('user-b');
    limiter.reset();
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-b')).toBe(true);
  });
});

describe('shared limiters', () => {
  beforeEach(() => {
    friendRequestLimiter.reset();
    reunionInviteLimiter.reset();
    createReunionLimiter.reset();
  });

  afterEach(() => {
    friendRequestLimiter.reset();
    reunionInviteLimiter.reset();
    createReunionLimiter.reset();
  });

  it('friend requests are capped at 10 per hour', () => {
    for (let i = 0; i < 10; i++) {
      expect(friendRequestLimiter.check('user-a')).toBe(true);
    }
    expect(() => friendRequestLimiter.check('user-a')).toThrow(RateLimitError);
  });

  it('reunion invites are capped at 20 per hour', () => {
    for (let i = 0; i < 20; i++) {
      expect(reunionInviteLimiter.check('user-a')).toBe(true);
    }
    expect(() => reunionInviteLimiter.check('user-a')).toThrow(RateLimitError);
  });

  it('reunion creation is capped at 5 per hour', () => {
    for (let i = 0; i < 5; i++) {
      expect(createReunionLimiter.check('user-a')).toBe(true);
    }
    expect(() => createReunionLimiter.check('user-a')).toThrow(RateLimitError);
  });

  it('different users do not affect each other', () => {
    for (let i = 0; i < 10; i++) {
      friendRequestLimiter.check('user-a');
    }
    expect(friendRequestLimiter.check('user-b')).toBe(true);
  });
});