import prisma from './database.js';
import { cache } from './cache.js';
import { config } from '../config.js';
import logger from './logger.js';

export async function isGuildSubscribed(guildId: string): Promise<boolean> {
  if (!guildId) return false;

  // Primary owner server is always subscribed
  if (guildId === config.DISCORD_GUILD_ID) {
    return true;
  }

  const cacheKey = `guild:${guildId}:subscribed`;
  try {
    const cached = await cache.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Boolean(cached);
    }

    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { isSubscribed: true }
    });

    const isSub = guild ? guild.isSubscribed : false;
    await cache.set(cacheKey, isSub, 300); // Cache for 5 minutes
    return isSub;
  } catch (error) {
    logger.error(`Error checking subscription status for guild ${guildId}:`, error);
    return false;
  }
}

export async function setGuildSubscription(guildId: string, isSubscribed: boolean): Promise<void> {
  const cacheKey = `guild:${guildId}:subscribed`;
  try {
    await prisma.guild.upsert({
      where: { id: guildId },
      update: { isSubscribed },
      create: {
        id: guildId,
        name: 'New Server',
        ownerId: '0',
        isSubscribed
      }
    });

    await cache.set(cacheKey, isSubscribed, 300);
  } catch (error) {
    logger.error(`Error updating subscription for guild ${guildId}:`, error);
    throw error;
  }
}
