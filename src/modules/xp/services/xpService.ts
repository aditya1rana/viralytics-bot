import { Member, Badge, MemberBadge } from '@prisma/client';
import { prisma } from '../../../services/database.js';
import { cache } from '../../../services/cache.js';
import { logger } from '../../../services/logger.js';
import { auditLogger } from '../../../services/auditLogger.js';
import { calculateLevel, wouldLevelUp, xpToNextLevel, getNewLevel } from '../../../services/xpEngine.js';
import { ensureMember, ensureGuild } from '../../../utils/helpers.js';
import { Guild as DiscordGuild, GuildMember } from 'discord.js';
import { AuditAction } from '@prisma/client';

export const xpService = {
  async addXp(guildId: string, userId: string, amount: number, reason: string = 'Activity'): Promise<void> {
    try {
      const member = await ensureMember(guildId, userId);
      const oldXp = member.totalXp;
      const newXp = oldXp + amount;
      
      const newLevel = calculateLevel(newXp);
      
      await prisma.member.update({
        where: { guildId_userId: { guildId, userId } },
        data: {
          totalXp: newXp,
          level: newLevel,
          lastXpGainAt: new Date()
        }
      });
      
      await cache.del(`member:${guildId}:${userId}`);
      
      if (this.checkLevelUp(member, oldXp, newXp)) {
        await auditLogger({
          guildId,
          action: AuditAction.LEVEL_UP,
          targetId: userId,
          reason: `Leveled up to ${newLevel}`
        });
      }
      
      await this.checkBadgeCriteria(guildId, userId);
    } catch (error) {
      logger.error(`Failed to add XP for user ${userId} in guild ${guildId}`, error);
    }
  },

  checkLevelUp(member: Member, oldXp: number, newXp: number): boolean {
    const oldLevel = calculateLevel(oldXp);
    const newLevel = calculateLevel(newXp);
    return newLevel > oldLevel;
  },

  async grantRoleReward(discordGuild: DiscordGuild, discordMember: GuildMember, level: number): Promise<void> {
    try {
      const roleRewards = await prisma.roleReward.findMany({
        where: { guildId: discordGuild.id, requiredLevel: { lte: level } },
        orderBy: { requiredLevel: 'asc' }
      });
      
      if (!roleRewards.length) return;
      
      for (const reward of roleRewards) {
        if (!discordMember.roles.cache.has(reward.roleId)) {
          await discordMember.roles.add(reward.roleId, `Reached level ${level}`);
          await auditLogger({
            guildId: discordGuild.id,
            action: AuditAction.ROLE_REWARD_GRANTED,
            targetId: discordMember.id,
            reason: `Granted role ${reward.roleId} for reaching level ${level}`
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to grant role rewards for ${discordMember.id}`, error);
    }
  },

  async checkBadgeCriteria(guildId: string, memberId: string): Promise<void> {
    try {
      const member = await prisma.member.findUnique({
        where: { guildId_userId: { guildId, userId: memberId } },
        include: { memberBadges: true }
      });
      if (!member) return;
      
      const badges = await prisma.badge.findMany({
        where: { guildId }
      });
      
      for (const badge of badges) {
        const hasBadge = member.memberBadges.some((b: any) => b.badgeId === badge.id);
        if (hasBadge) continue;
        
        let qualifies = false;
        if (badge.criteriaType === 'LEVEL' && member.level >= (badge.criteriaValue || 0)) {
          qualifies = true;
        } else if (badge.criteriaType === 'XP' && member.totalXp >= (badge.criteriaValue || 0)) {
          qualifies = true;
        }
        
        if (qualifies) {
          await prisma.memberBadge.create({
            data: {
              memberId: member.id,
              badgeId: badge.id
            }
          });
          await auditLogger({
            guildId,
            action: AuditAction.BADGE_GRANTED,
            targetId: memberId,
            reason: `Granted badge ${badge.name}`
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to check badge criteria for ${memberId}`, error);
    }
  },

  async getXpLeaderboard(guildId: string, limit: number = 10): Promise<Member[]> {
    try {
      return await prisma.member.findMany({
        where: { guildId },
        orderBy: { totalXp: 'desc' },
        take: limit
      });
    } catch (error) {
      logger.error(`Failed to get XP leaderboard for guild ${guildId}`, error);
      return [];
    }
  }
};
