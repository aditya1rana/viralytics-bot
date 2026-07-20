import Redis from 'ioredis';
import { logger } from './logger.js';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 5000),
      lazyConnect: true,
    });

    redisClient.on('error', (err) => logger.error('Redis Error:', err));
    redisClient.on('connect', () => logger.info('✅ Connected to Redis'));
    redisClient.on('reconnecting', () => logger.warn('🔄 Reconnecting to Redis...'));
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedis();
  try {
    await redis.connect();
  } catch (err) {
    logger.error('❌ Failed to connect to Redis:', err);
    throw err;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('✅ Disconnected from Redis');
  }
}
