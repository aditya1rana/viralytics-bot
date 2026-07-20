import { getGuildConfig, updateGuildConfig } from '../../../services/configManager.js';
import { cache } from '../../../services/cache.js';
import { logger } from '../../../services/logger.js';

interface ConfigKey {
  key: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
}

const CONFIG_KEYS: ConfigKey[] = [
  { key: 'prefix', description: 'Bot command prefix', type: 'string' },
  { key: 'language', description: 'Bot language', type: 'string' },
  { key: 'xpRate', description: 'Multiplier for XP gain', type: 'number' },
  { key: 'autoRoleEnabled', description: 'Whether auto-role is enabled', type: 'boolean' }
];

export const configService = {
  async getFullConfig(guildId: string) {
    try {
      const config = await getGuildConfig(guildId);
      return config;
    } catch (error) {
      logger.error(`Error getting full config for ${guildId}: ${error}`);
      throw error;
    }
  },

  async setChannel(guildId: string, type: string, channelId: string) {
    try {
      await updateGuildConfig(guildId, {
        [type]: channelId
      });
      await cache.del(`guild_config:${guildId}`);
    } catch (error) {
      logger.error(`Error setting channel ${type} for ${guildId}: ${error}`);
      throw error;
    }
  },

  async setRole(guildId: string, type: string, roleId: string) {
    try {
      await updateGuildConfig(guildId, {
        [type]: roleId
      });
      await cache.del(`guild_config:${guildId}`);
    } catch (error) {
      logger.error(`Error setting role ${type} for ${guildId}: ${error}`);
      throw error;
    }
  },

  async setValue(guildId: string, key: string, value: string) {
    try {
      const configKey = CONFIG_KEYS.find(k => k.key === key);
      let parsedValue: any = value;

      if (configKey) {
        if (configKey.type === 'number') {
          parsedValue = Number(value);
          if (isNaN(parsedValue)) throw new Error('Invalid number format');
        } else if (configKey.type === 'boolean') {
          parsedValue = value.toLowerCase() === 'true' || value === '1';
        }
      }

      await updateGuildConfig(guildId, {
        [key]: parsedValue
      });
      await cache.del(`guild_config:${guildId}`);
    } catch (error) {
      logger.error(`Error setting config value ${key} for ${guildId}: ${error}`);
      throw error;
    }
  },

  getConfigKeys(): ConfigKey[] {
    return CONFIG_KEYS;
  }
};
