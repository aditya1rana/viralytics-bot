import { Client } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { logger } from '../services/logger.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client: Client) {
  const modulesPath = path.join(__dirname, '..', 'modules');
  if (!fs.existsSync(modulesPath)) return;

  const moduleDirs = fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let eventCount = 0;

  for (const moduleDir of moduleDirs) {
    const eventsPath = path.join(modulesPath, moduleDir, 'events');
    if (!fs.existsSync(eventsPath)) continue;

    const eventFiles = fs.readdirSync(eventsPath)
      .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      try {
        const imported = await import(`file://${filePath.replace(/\\/g, '/')}`);
        const events = imported.default || imported;

        // Support single event or array of events
        const eventArray = Array.isArray(events) ? events : [events];

        for (const event of eventArray) {
          if (!event?.name) continue;

          if (event.once) {
            client.once(event.name, (...args: unknown[]) => event.execute(...args));
          } else {
            client.on(event.name, (...args: unknown[]) => event.execute(...args));
          }
          eventCount++;
          logger.debug(`📡 Loaded event: ${String(event.name)} (${moduleDir})`);
        }
      } catch (err) {
        logger.error(`❌ Failed to load event ${file}:`, err);
      }
    }
  }

  logger.info(`✅ Loaded ${eventCount} events`);
}
