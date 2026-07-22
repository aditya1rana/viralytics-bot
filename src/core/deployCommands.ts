import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../services/logger.js';
import { loadCommands } from './commandHandler.js';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import type { Command } from '../types/index.js';

export async function deployGuildCommands(guildId: string, commandsCollection?: Collection<string, Command>) {
  if (!guildId) return;

  let commandData: any[] = [];

  if (commandsCollection && commandsCollection.size > 0) {
    commandData = commandsCollection.map(cmd => cmd.data.toJSON());
  } else {
    const tempClient = new Client({ intents: [GatewayIntentBits.Guilds] }) as Client & { commands: Collection<string, Command> };
    tempClient.commands = new Collection();
    await loadCommands(tempClient);
    commandData = tempClient.commands.map(cmd => cmd.data.toJSON());
    tempClient.destroy();
  }

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

  try {
    logger.info(`⚡ Instantly deploying ${commandData.length} commands to guild ${guildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guildId),
      { body: commandData },
    );
    logger.info(`✅ Successfully deployed commands instantly to guild ${guildId}!`);
  } catch (err) {
    logger.error(`❌ Failed to deploy commands to guild ${guildId}:`, err);
  }
}

export async function deployCommands(commandsCollection?: Collection<string, Command>) {
  let commandData: any[] = [];

  if (commandsCollection && commandsCollection.size > 0) {
    commandData = commandsCollection.map(cmd => cmd.data.toJSON());
  } else {
    const tempClient = new Client({ intents: [GatewayIntentBits.Guilds] }) as Client & { commands: Collection<string, Command> };
    tempClient.commands = new Collection();
    await loadCommands(tempClient);
    commandData = tempClient.commands.map(cmd => cmd.data.toJSON());
    tempClient.destroy();
  }

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

  try {
    logger.info(`🔄 Deploying ${commandData.length} global application commands...`);

    // Register globally for all servers
    await rest.put(
      Routes.applicationCommands(config.DISCORD_CLIENT_ID),
      { body: commandData },
    );

    logger.info(`✅ Successfully deployed ${commandData.length} commands globally!`);
  } catch (err) {
    logger.error('❌ Failed to deploy commands globally:', err);
  }
}
