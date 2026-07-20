import {
  Client,
  Collection,
  GatewayIntentBits,
  Options,
  Partials,
} from 'discord.js';
import { config } from './config.js';
import { logger } from './services/logger.js';
import type { Command } from './types/index.js';

export function createBot(): Client & { commands: Collection<string, Command> } {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.GuildMember,
      Partials.User,
    ],
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: 200,
      ReactionManager: 0,
      GuildMemberManager: {
        maxSize: 500,
        keepOverLimit: (member) => member.id === client.user?.id,
      },
    }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      messages: {
        interval: 3600,
        lifetime: 1800,
      },
    },
  }) as Client & { commands: Collection<string, Command> };

  client.commands = new Collection();

  return client;
}
