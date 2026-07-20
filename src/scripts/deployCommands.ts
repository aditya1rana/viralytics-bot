import { deployCommands } from '../core/deployCommands.js';
import { logger } from '../services/logger.js';

logger.info('🔄 Deploying slash commands...');
deployCommands()
  .then(() => {
    logger.info('✅ Commands deployed successfully');
  })
  .catch((err) => {
    logger.error('❌ Failed to deploy commands:', err);
    setTimeout(() => process.exit(1), 1000);
  });
