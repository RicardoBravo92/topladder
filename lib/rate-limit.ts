const MS_PER_HOUR = 60 * 60 * 1000;

export class RateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super('Too many requests. Please try again in a moment.');
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

type RateLimiterOptions = {
  max: number;
  windowMs: number;
};

export function createRateLimiter({ max, windowMs }: RateLimiterOptions) {
  const hits = new Map<string, number[]>();

  return {
    check(key: string) {
      const now = Date.now();
      const windowStart = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

      if (recent.length >= max) {
        const retryAfterMs = recent[0] + windowMs - now;
        throw new RateLimitError(Math.max(retryAfterMs, 1000));
      }

      recent.push(now);
      hits.set(key, recent);
      return true;
    },

    reset(key?: string) {
      if (key) {
        hits.delete(key);
      } else {
        hits.clear();
      }
    },
  };
}

export const friendRequestLimiter = createRateLimiter({
  max: 10,
  windowMs: MS_PER_HOUR,
});

export const reunionInviteLimiter = createRateLimiter({
  max: 20,
  windowMs: MS_PER_HOUR,
});

export const createReunionLimiter = createRateLimiter({
  max: 5,
  windowMs: MS_PER_HOUR,
});