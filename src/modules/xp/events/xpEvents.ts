import { BotEvent } from '../../../types/index.js';
import { Events, Message, TextChannel } from 'discord.js';
import { xpService } from '../services/xpService.js';
import { getGuildConfig } from '../../../services/configManager.js';
import { cache } from '../../../services/cache.js';
import { logger } from '../../../services/logger.js';
import { ensureMember, ensureGuild } from '../../../utils/helpers.js';
import { calculateLevel, wouldLevelUp } from '../../../services/xpEngine.js';

const messageCreateEvent: BotEvent<'messageCreate'> = {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message) {
    if (message.author.bot || !message.guild) return;
    
    try {
      const guildId = message.guild.id;
      const userId = message.author.id;
      
      await ensureGuild(message.guild);
      
      let memberRecord = await cache.get(`member:${guildId}:${userId}`) as any;
      if (!memberRecord) {
        memberRecord = await ensureMember(guildId, userId);
        await cache.set(`member:${guildId}:${userId}`, memberRecord, 300);
      }
      
      const config = await getGuildConfig(guildId);
      
      const cooldownSeconds = config?.xpCooldownSeconds || 60;
      const xpPerMessage = config?.xpPerMessage || 15;
      
      const lastGainAt = memberRecord.lastXpGainAt;
      const now = new Date();
      
      if (lastGainAt && (now.getTime() - new Date(lastGainAt).getTime()) < cooldownSeconds * 1000) {
        return;
      }
      
      const oldXp = memberRecord.totalXp;
      await xpService.addXp(guildId, userId, xpPerMessage, 'Message Sent');
      
      const newXp = oldXp + xpPerMessage;
      if (wouldLevelUp(oldXp, newXp)) {
        const newLevel = calculateLevel(newXp);
        
        if (message.member) {
          await xpService.grantRoleReward(message.guild, message.member, newLevel);
        }
      }
      
    } catch (error) {
      logger.error(`Error in xp messageCreate event:`, error);
    }
  }
};

export default [messageCreateEvent];
