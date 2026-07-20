import { Guild, GuildMember } from 'discord.js';
import prisma from '../../../services/database.js';
import logger from '../../../services/logger.js';
import { auditLogger } from '../../../services/auditLogger.js';
import { VerificationStatus, AuditAction } from '@prisma/client';
import { accountAgeDays, ensureUser, ensureMember } from '../../../utils/helpers.js';
import { xpService } from '../../xp/services/xpService.js';

export const verificationService = {
  async verifyMember(guild: Guild, member: GuildMember, verifiedBy?: string) {
    try {
      const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
      if (!config) return false;

      // Make sure the User and Member exist in the database before updating status
      await ensureUser(member);
      await ensureMember(guild.id, member.id);

      await prisma.member.update({
        where: { guildId_userId: { guildId: guild.id, userId: member.id } },
        data: { verificationStatus: VerificationStatus.VERIFIED }
      });

      if (config.verifiedRoleId) {
        const role = guild.roles.cache.get(config.verifiedRoleId);
        if (role) await member.roles.add(role).catch(e => logger.error(`Failed to add role ${config.verifiedRoleId}`, e));
      }
      
      if (config.unverifiedRoleId) {
        const role = guild.roles.cache.get(config.unverifiedRoleId);
        if (role) await member.roles.remove(role).catch(e => logger.error(`Failed to remove role ${config.unverifiedRoleId}`, e));
      }

      await auditLogger({
        guildId: guild.id,
        action: AuditAction.MEMBER_VERIFIED,
        targetId: member.id,
        actorId: verifiedBy || member.id,
        reason: 'User verified via verification system',
      });

      // Give 50 XP for verifying
      await xpService.addXp(guild.id, member.id, 50, 'Completed verification');

      return true;
    } catch (error) {
      logger.error('Error verifying member:', error);
      return false;
    }
  },

  async isVerified(guildId: string, userId: string) {
    const member = await prisma.member.findUnique({
      where: { guildId_userId: { guildId, userId } }
    });
    return member?.verificationStatus === VerificationStatus.VERIFIED;
  },

  async getVerificationStats(guildId: string) {
    const stats = await prisma.member.groupBy({
      by: ['verificationStatus'],
      where: { guildId },
      _count: { id: true }
    });
    return stats;
  },

  checkAltAccount(member: GuildMember, minDays: number) {
    const days = accountAgeDays(member.user.createdAt);
    return days < minDays;
  }
};
