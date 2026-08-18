import prisma from './database.js';
import { cache } from './cache.js';
import { config } from '../config.js';
import logger from './logger.js';
import { deployGuildCommands, removeGuildCommands } from '../core/deployCommands.js';

export interface SubscriptionOptions {
  durationDays?: number; // 30, 60, 90, 365, or undefined for lifetime
  customExpiresAt?: string | Date | null;
  subscriptionTier?: string; // ENTERPRISE, PRO, STANDARD
}

export async function isGuildSubscribed(guildId: string): Promise<boolean> {
  if (!guildId) return false;

  // Primary owner server is always active & subscribed
  if (guildId === config.DISCORD_GUILD_ID) {
    return true;
  }

  const cacheKey = `guild:${guildId}:subscribed`;
  try {
    const cached = await cache.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Boolean(cached);
    }

    // CACHE MISS! The DB might take >3s on cold boot, which would crash the Discord interaction.
    // Instead of waiting, we optimistically allow this interaction immediately,
    // and fetch the subscription status in the background.
    prisma.guild.findUnique({
      where: { id: guildId },
      select: { isSubscribed: true, subscriptionExpiresAt: true }
    }).then(async guild => {
      if (!guild || !guild.isSubscribed) {
        await cache.set(cacheKey, false, 300);
      } else if (guild.subscriptionExpiresAt && new Date() > new Date(guild.subscriptionExpiresAt)) {
        logger.warn(`⏳ Guild ${guildId} subscription expired. Deactivating...`);
        await prisma.guild.update({ where: { id: guildId }, data: { isSubscribed: false } });
        await removeGuildCommands(guildId).catch(() => null);
        await cache.set(cacheKey, false, 300);
      } else {
        await cache.set(cacheKey, true, 300);
      }
    }).catch(error => {
      logger.error(`Error checking subscription status for guild ${guildId} in background:`, error);
    });

    return true; // Optimistic allow!
  } catch (error) {
    logger.error(`Error checking subscription status for guild ${guildId}:`, error);
    return false;
  }
}

export async function setGuildSubscription(
  guildId: string, 
  isSubscribed: boolean, 
  options: SubscriptionOptions = {}
): Promise<void> {
  const cacheKey = `guild:${guildId}:subscribed`;
  try {
    let expiresAt: Date | null = null;

    if (isSubscribed) {
      if (options.customExpiresAt) {
        expiresAt = new Date(options.customExpiresAt);
      } else if (options.durationDays && options.durationDays > 0) {
        expiresAt = new Date(Date.now() + options.durationDays * 86_400_000);
      }
      // If durationDays === null or undefined, expiresAt remains null (Lifetime)
    }

    await prisma.guild.upsert({
      where: { id: guildId },
      update: { 
        isSubscribed,
        subscriptionExpiresAt: isSubscribed ? expiresAt : null,
        ...(options.subscriptionTier && { subscriptionTier: options.subscriptionTier }),
      },
      create: {
        id: guildId,
        name: 'New Server',
        ownerId: '0',
        isSubscribed,
        subscriptionExpiresAt: isSubscribed ? expiresAt : null,
        subscriptionTier: options.subscriptionTier || 'ENTERPRISE',
      }
    });

    await cache.set(cacheKey, isSubscribed, 300);

    if (isSubscribed) {
      // Instantly deploy slash commands to this approved guild!
      await deployGuildCommands(guildId).catch((err) => logger.error(`Error deploying guild commands to ${guildId}:`, err));
    } else {
      // Instantly remove slash commands from this deactivated guild!
      await removeGuildCommands(guildId).catch((err) => logger.error(`Error removing guild commands from ${guildId}:`, err));
    }
  } catch (error) {
    logger.error(`Error updating subscription for guild ${guildId}:`, error);
    throw error;
  }
}

export async function syncGuildsWithDiscord(client?: any): Promise<void> {
  if (!client || !client.guilds) return;

  try {
    const activeGuilds = Array.from(client.guilds.cache.values()) as any[];
    
    for (const g of activeGuilds) {
      const dbGuild = await prisma.guild.upsert({
        where: { id: g.id },
        update: {
          name: g.name,
          iconUrl: g.iconURL() || null,
          ownerId: g.ownerId,
          leftAt: null,
        },
        create: {
          id: g.id,
          name: g.name,
          iconUrl: g.iconURL() || null,
          ownerId: g.ownerId,
          isSubscribed: g.id === config.DISCORD_GUILD_ID,
        }
      });

      // Deploy or remove commands based on current subscription state
      if (dbGuild.isSubscribed || g.id === config.DISCORD_GUILD_ID) {
        await cache.set(`guild:${g.id}:subscribed`, true, 300);
        await deployGuildCommands(g.id, client.commands).catch(() => null);
      } else {
        await cache.set(`guild:${g.id}:subscribed`, false, 300);
        await removeGuildCommands(g.id).catch(() => null);
      }
    }
  } catch (error) {
    logger.error('Error syncing guilds with Discord client cache:', error);
  }
}
