import { GuildConfig } from '@prisma/client';
import { prisma } from './database.js';
import { cache } from './cache.js';
import { logger } from './logger.js';

const CONFIG_TTL = 600; // 10 minutes

/**
 * Get guild configuration, with Redis caching.
 * Auto-creates config if it doesn't exist.
 */
export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  return cache.getOrSet(`guild:${guildId}:config`, async () => {
    let config = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (!config) {
      config = await prisma.guildConfig.create({ data: { guildId } });
      logger.info(`Created default config for guild ${guildId}`);
    }
    return config;
  }, CONFIG_TTL);
}

/**
 * Update guild configuration and invalidate cache.
 */
export async function updateGuildConfig(
  guildId: string,
  data: Partial<Omit<GuildConfig, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>,
): Promise<GuildConfig> {
  const config = await prisma.guildConfig.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  });
  await cache.del(`guild:${guildId}:config`);
  return config;
}

/**
 * Get a specific config value.
 */
export async function getConfigValue<K extends keyof GuildConfig>(
  guildId: string,
  key: K,
): Promise<GuildConfig[K]> {
  const config = await getGuildConfig(guildId);
  return config[key];
}
