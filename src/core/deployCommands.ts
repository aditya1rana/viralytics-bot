import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../services/logger.js';
import { loadCommands } from './commandHandler.js';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import type { Command } from '../types/index.js';

export async function deployCommands() {
  // Create a temporary client to load commands
  const tempClient = new Client({ intents: [GatewayIntentBits.Guilds] }) as Client & { commands: Collection<string, Command> };
  tempClient.commands = new Collection();

  await loadCommands(tempClient);

  const commandData = tempClient.commands.map(cmd => cmd.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

  try {
    logger.info(`🔄 Deploying ${commandData.length} commands to guild ${config.DISCORD_GUILD_ID}...`);

    await rest.put(
      Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
      { body: commandData },
    );

    logger.info(`✅ Successfully deployed ${commandData.length} commands`);
  } catch (err) {
    logger.error('❌ Failed to deploy commands:', err);
    throw err;
  }

  tempClient.destroy();
}
