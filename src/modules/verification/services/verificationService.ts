import { Guild, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import prisma from '../../../services/database.js';
import logger from '../../../services/logger.js';
import { auditLogger } from '../../../services/auditLogger.js';
import { VerificationStatus, AuditAction } from '@prisma/client';
import { accountAgeDays, ensureUser, ensureMember } from '../../../utils/helpers.js';
import { xpService } from '../../xp/services/xpService.js';
import COLORS from '../../../utils/colors.js';
import { cache } from '../../../services/cache.js';

export const verificationService = {
  async logVerification(guild: Guild, member: GuildMember) {
    try {
      const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
      if (config?.verificationLogChannelId) {
        const logChannel = guild.channels.cache.get(config.verificationLogChannelId) as TextChannel | undefined;
        if (logChannel) {
          // Look up inviter from database
          const invite = await prisma.invite.findFirst({
            where: { guildId: guild.id, inviteeId: member.id },
            orderBy: { joinedAt: 'desc' }
          });

          let inviterText = 'Unknown / Direct Link';
          if (invite && invite.inviterId) {
            inviterText = `<@${invite.inviterId}> (\`${invite.inviterId}\`)`;
          }

          const logEmbed = new EmbedBuilder()
            .setTitle('👤 Member Verified')
            .setColor(COLORS.SUCCESS)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
              { name: 'User', value: `<@${member.id}> (${member.user.username})`, inline: true },
              { name: 'User ID', value: `\`${member.id}\``, inline: true },
              { name: 'Invited By', value: inviterText, inline: true },
              { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (${accountAgeDays(member.user.createdAt)} days ago)`, inline: false },
              { name: 'Verified At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] }).catch(e => logger.error(`Failed to send log to verification log channel:`, e));
        }
      }
    } catch (e) {
      logger.error('Error logging verification:', e);
    }
  },

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

      // Log to verification log channel
      await this.logVerification(guild, member);

      await auditLogger({
        guildId: guild.id,
        action: AuditAction.MEMBER_VERIFIED,
        targetId: member.id,
        actorId: verifiedBy || member.id,
        reason: 'User verified via verification system',
      });

      // Give 50 XP for verifying
      await xpService.addXp(guild.id, member.id, 50, 'Completed verification');

      // Invalidate verification cache
      await cache.del(`member:${guild.id}:${member.id}:verified`);

      return true;
    } catch (error) {
      logger.error('Error verifying member:', error);
      return false;
    }
  },

  async isVerified(guildId: string, userId: string) {
    const cacheKey = `member:${guildId}:${userId}:verified`;
    const cached = await cache.get<boolean>(cacheKey);
    if (cached !== null) return cached;

    const member = await prisma.member.findUnique({
      where: { guildId_userId: { guildId, userId } }
    });
    const verified = member?.verificationStatus === VerificationStatus.VERIFIED;
    await cache.set(cacheKey, verified, 3600); // Cache for 1 hour
    return verified;
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
