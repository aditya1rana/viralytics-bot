import { prisma } from '../../../services/database.js';
import { logger } from '../../../services/logger.js';
import { accountAgeDays, ensureMember } from '../../../utils/helpers.js';
import { InviteStatus } from '@prisma/client';

export class InviteService {
  /**
   * Create an Invite record when someone joins
   */
  static async trackInvite(guildId: string, inviterId: string, inviteeId: string, code: string, isFake: boolean) {
    try {
      const status = isFake ? InviteStatus.FAKE : InviteStatus.VALID;

      // Ensure members exist in DB
      await ensureMember(guildId, inviterId);
      await ensureMember(guildId, inviteeId);

      // Create invite record
      const invite = await prisma.invite.create({
        data: {
          guildId,
          inviterId,
          inviteeId,
          code,
          status
        }
      });

      // Update inviter's stats
      if (isFake) {
        await prisma.member.update({
          where: { guildId_userId: { guildId, userId: inviterId } },
          data: { fakeInvites: { increment: 1 } }
        });
      } else {
        await prisma.member.update({
          where: { guildId_userId: { guildId, userId: inviterId } },
          data: { totalInvites: { increment: 1 } }
        });
      }

      return invite;
    } catch (error) {
      logger.error(`Error tracking invite:`, error);
      throw error;
    }
  }

  /**
   * Check if a member's account is too new
   */
  static async detectFakeInvite(member: any): Promise<boolean> {
    try {
      // Get fake invite threshold from guild config, default to 7 days
      const config = await prisma.guildConfig.findUnique({
        where: { guildId: member.guild.id },
        select: { fakeInviteThresholdDays: true }
      });
      
      const threshold = config?.fakeInviteThresholdDays ?? 7;
      const age = accountAgeDays(member.user.createdAt);
      
      return age < threshold;
    } catch (error) {
      logger.error(`Error detecting fake invite:`, error);
      return false; // Fallback to not fake if error
    }
  }

  /**
   * Get invite stats for a user
   */
  static async getInviteStats(guildId: string, userId: string) {
    try {
      const member = await ensureMember(guildId, userId);
      return {
        total: member.totalInvites,
        left: member.leftInvites,
        fake: member.fakeInvites,
        bonus: member.bonusInvites,
        valid: (member.totalInvites + member.bonusInvites) - member.leftInvites - member.fakeInvites
      };
    } catch (error) {
      logger.error(`Error getting invite stats:`, error);
      throw error;
    }
  }

  /**
   * Get invite leaderboard
   */
  static async getInviteLeaderboard(guildId: string, limit: number = 10) {
    try {
      const members = await prisma.member.findMany({
        where: { guildId },
        orderBy: { totalInvites: 'desc' },
        take: limit
      });
      return members;
    } catch (error) {
      logger.error(`Error getting invite leaderboard:`, error);
      throw error;
    }
  }

  /**
   * Add bonus invites (Admin only)
   */
  static async addBonusInvites(guildId: string, userId: string, amount: number) {
    try {
      const member = await prisma.member.update({
        where: { guildId_userId: { guildId, userId } },
        data: { bonusInvites: { increment: amount } }
      });
      return member;
    } catch (error) {
      logger.error(`Error adding bonus invites:`, error);
      throw error;
    }
  }

  /**
   * Handle when a member leaves
   */
  static async handleMemberLeave(guildId: string, userId: string) {
    try {
      // Find the invite record where this user is the invitee
      const invite = await prisma.invite.findFirst({
        where: { guildId, inviteeId: userId }
      });

      if (!invite) return null;

      // Mark invite as LEFT
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.LEFT }
      });

      // Update inviter's stats
      await prisma.member.update({
        where: { guildId_userId: { guildId, userId: invite.inviterId } },
        data: { leftInvites: { increment: 1 } }
      });

      return invite;
    } catch (error) {
      logger.error(`Error handling member leave for invites:`, error);
      throw error;
    }
  }
}
