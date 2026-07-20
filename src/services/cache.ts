import { getRedis } from './redis.js';
import { logger } from './logger.js';

export class CacheManager {
  private prefix: string;
  private defaultTtl: number;

  constructor(prefix = 'vbot', defaultTtl = 300) {
    this.prefix = prefix;
    this.defaultTtl = defaultTtl;
  }

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await getRedis().get(this.key(key));
      return data ? JSON.parse(data) as T : null;
    } catch (err) {
      logger.debug(`Cache GET miss/error for ${key}:`, err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      await getRedis().set(
        this.key(key),
        JSON.stringify(value),
        'EX',
        ttl ?? this.defaultTtl,
      );
    } catch (err) {
      logger.debug(`Cache SET error for ${key}:`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await getRedis().del(this.key(key));
    } catch (err) {
      logger.debug(`Cache DEL error for ${key}:`, err);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const redis = getRedis();
      const keys = await redis.keys(this.key(pattern));
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      logger.debug(`Cache invalidate error for ${pattern}:`, err);
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
}

export const cache = new CacheManager();
