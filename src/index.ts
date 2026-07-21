import { config } from './config.js';
import { createBot } from './bot.js';
import { loadCommands, loadInteractionHandlers } from './core/commandHandler.js';
import { loadEvents } from './core/eventHandler.js';
import { registerInteractionHandler } from './core/interactionHandler.js';
import { connectDatabase, disconnectDatabase } from './services/database.js';
import { connectRedis, disconnectRedis } from './services/redis.js';
import { logger } from './services/logger.js';
import { Events } from 'discord.js';
import http from 'node:http';

async function main() {
  logger.info('🚀 Starting Viralytics Bot...');

  // Connect to services
  await connectDatabase();
  await connectRedis();

  // Create bot
  const client = createBot();

  // Load commands, events, and interactions
  await loadCommands(client);
  await loadEvents(client);
  const { buttons, selectMenus, modals } = await loadInteractionHandlers();

  // Register interaction handler
  registerInteractionHandler(client, buttons, selectMenus, modals);

  // Ready event
  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`✅ Ready! Logged in as ${readyClient.user.tag}`);
    logger.info(`📡 Serving ${readyClient.guilds.cache.size} guild(s)`);
    logger.info(`📌 ${client.commands.size} commands loaded`);
  });

  // Start Dashboard Express Server
  const port = process.env.PORT || 10000;
  const { createDashboardApp } = await import('./dashboard/server.js');
  const app = createDashboardApp();
  
  const server = app.listen(port, () => {
    logger.info(`🌐 Dashboard & API server listening on port ${port}`);
  });

  // Login
  await client.login(config.DISCORD_TOKEN);

  // ── Graceful Shutdown ──
  const gracefulShutdown = async (signal: string) => {
    logger.warn(`⚠️ Received ${signal}. Starting graceful shutdown...`);

    const forceTimer = setTimeout(() => {
      logger.error('❌ Forced shutdown (timeout exceeded)');
      process.exit(1);
    }, 15_000);

    try {
      server.close();
      logger.info('✅ HTTP server closed');

      client.destroy();
      logger.info('✅ Discord client destroyed');

      await disconnectDatabase();
      await disconnectRedis();

      clearTimeout(forceTimer);
      logger.info('👋 Cleanup complete. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection:', err);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    gracefulShutdown('uncaughtException');
  });
}

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
