import { getRedis } from './redis.js';

export class RateLimiter {
  /**
   * Sliding window rate limiter using Redis.
   * @returns true if the action is allowed, false if rate-limited.
   */
  static async check(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const redis = getRedis();
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    pipeline.zcard(redisKey);
    pipeline.pexpire(redisKey, windowMs);

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) || 0;

    if (count > maxRequests) {
      // Get oldest entry in window to calculate retry
      const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
      const retryAfterMs = oldest.length >= 2
        ? windowMs - (now - parseInt(oldest[1]))
        : windowMs;

      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    return { allowed: true, retryAfterMs: 0 };
  }
}
