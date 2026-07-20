import { Collection, Client } from 'discord.js';
import { Command, ButtonHandler, SelectMenuHandler, ModalHandler } from '../types/index.js';
import { logger } from '../services/logger.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client: Client & { commands: Collection<string, Command> }) {
  client.commands = new Collection();
  const modulesPath = path.join(__dirname, '..', 'modules');

  if (!fs.existsSync(modulesPath)) return;

  const moduleDirs = fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const moduleDir of moduleDirs) {
    const commandsPath = path.join(modulesPath, moduleDir, 'commands');
    if (!fs.existsSync(commandsPath)) continue;

    const commandFiles = fs.readdirSync(commandsPath)
      .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        const imported = await import(`file://${filePath.replace(/\\/g, '/')}`);
        const command: Command = imported.default || imported;

        if (command?.data?.name) {
          client.commands.set(command.data.name, command);
          logger.info(`📌 Loaded command: /${command.data.name} (${moduleDir})`);
        }
      } catch (err) {
        logger.error(`❌ Failed to load command ${file}:`, err);
      }
    }
  }

  logger.info(`✅ Loaded ${client.commands.size} commands`);
}

export async function loadInteractionHandlers(): Promise<{
  buttons: Collection<string, ButtonHandler>;
  selectMenus: Collection<string, SelectMenuHandler>;
  modals: Collection<string, ModalHandler>;
}> {
  const buttons = new Collection<string, ButtonHandler>();
  const selectMenus = new Collection<string, SelectMenuHandler>();
  const modals = new Collection<string, ModalHandler>();

  const modulesPath = path.join(__dirname, '..', 'modules');
  if (!fs.existsSync(modulesPath)) return { buttons, selectMenus, modals };

  const moduleDirs = fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const moduleDir of moduleDirs) {
    const interactionsPath = path.join(modulesPath, moduleDir, 'interactions');
    if (!fs.existsSync(interactionsPath)) continue;

    const files = fs.readdirSync(interactionsPath)
      .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'));

    for (const file of files) {
      const filePath = path.join(interactionsPath, file);
      try {
        const imported = await import(`file://${filePath.replace(/\\/g, '/')}`);
        const handlers = imported.default || imported;

        // Support single handler or array of handlers
        const handlerArray = Array.isArray(handlers) ? handlers : [handlers];

        for (const handler of handlerArray) {
          if (!handler?.customId) continue;
          const id = typeof handler.customId === 'string' ? handler.customId : handler.customId.source;

          if (file.includes('button') || file.includes('Button')) {
            buttons.set(id, handler);
          } else if (file.includes('select') || file.includes('Select') || file.includes('dropdown') || file.includes('Dropdown')) {
            selectMenus.set(id, handler);
          } else if (file.includes('modal') || file.includes('Modal')) {
            modals.set(id, handler);
          }
        }
      } catch (err) {
        logger.error(`❌ Failed to load interaction ${file}:`, err);
      }
    }
  }

  logger.info(`✅ Loaded ${buttons.size} buttons, ${selectMenus.size} select menus, ${modals.size} modals`);
  return { buttons, selectMenus, modals };
}
