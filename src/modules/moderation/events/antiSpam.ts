import { Message, Events } from 'discord.js';
import { BotEvent } from '../../../types/index.js';
import { cache } from '../../../services/cache.js';
import { getRedis } from '../../../services/redis.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { moderationService } from '../services/moderationService.js';
import logger from '../../../services/logger.js';
import { ModAction } from '@prisma/client';

const SCAM_PATTERNS = [
  /free.*nitro/i,
  /steam.*free/i,
  /discord.*gift/i,
  /click.*here.*free/i
];

const antiSpamEvent: BotEvent<'messageCreate'> = {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message) {
    if (message.author.bot || !message.guild) return;

    try {
      const guildId = message.guild.id;
      const userId = message.author.id;

      const isScam = SCAM_PATTERNS.some(pattern => pattern.test(message.content));
      if (isScam) {
        try {
          await message.delete();
          await moderationService.createModCase({
            guildId,
            userId,
            moderatorId: message.client.user.id,
            action: ModAction.WARN,
            reason: 'Automod: Scam link/pattern detected'
          });
          await (message.channel as any).send({
            embeds: [embedBuilder.error(`${message.author.toString()}, your message was removed for containing suspicious content.`)]
          });
          return;
        } catch (e) {
          logger.error(`Error deleting scam message: ${e}`);
        }
      }

      const cacheKey = `spam:${guildId}:${userId}`;
      let count = 0;
      
      const countStr = await cache.get(cacheKey);
      if (countStr) {
        count = parseInt(countStr as string, 10);
      }

      count++;
      
      if (count === 1) {
        await cache.set(cacheKey, '1', 5);
      } else {
        const redis = getRedis();
        const ttl = await redis.ttl(cacheKey);
        await cache.set(cacheKey, count.toString(), ttl > 0 ? ttl : 5);
      }

      if (count > 5) {
        try {
          const member = await message.guild.members.fetch(userId).catch(() => null);
          if (member && member.manageable) {
            const duration = 10 * 60 * 1000;
            await member.timeout(duration, 'Automod: Spamming');
            
            await moderationService.createModCase({
              guildId,
              userId,
              moderatorId: message.client.user.id,
              action: ModAction.TIMEOUT,
              reason: 'Automod: Spam detected',
              expiresAt: new Date(Date.now() + duration)
            });
            
            await (message.channel as any).send({
              embeds: [embedBuilder.warn(`${message.author.toString()} has been timed out for spamming.`)]
            });

            await cache.del(cacheKey);
          }
        } catch (e) {
          logger.error(`Failed to timeout user ${userId} for spam`, e);
        }
      }
    } catch (err) {
      logger.error('Error in antiSpam event handler', err);
    }
  }
};

export default antiSpamEvent;
