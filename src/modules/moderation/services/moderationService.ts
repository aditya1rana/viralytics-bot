import prisma from '../../../services/database.js';
import { ModAction, ModCase } from '@prisma/client';
import { getGuildConfig } from '../../../services/configManager.js';

export const moderationService = {
  async getNextCaseNumber(guildId: string): Promise<number> {
    const lastCase = await prisma.modCase.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
    });
    return lastCase ? lastCase.caseNumber + 1 : 1;
  },

  async createModCase(data: {
    guildId: string;
    userId: string;
    moderatorId: string;
    action: ModAction;
    reason?: string;
    expiresAt?: Date;
  }): Promise<ModCase> {
    const caseNumber = await this.getNextCaseNumber(data.guildId);
    return prisma.modCase.create({
      data: {
        guildId: data.guildId,
        targetId: data.userId,
        moderatorId: data.moderatorId,
        action: data.action,
        reason: data.reason || 'No reason provided',
        caseNumber,
        expiresAt: data.expiresAt,
      },
    });
  },

  async getUserCases(guildId: string, userId: string): Promise<ModCase[]> {
    return prisma.modCase.findMany({
      where: { guildId, targetId: userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getActiveCases(guildId: string): Promise<ModCase[]> {
    return prisma.modCase.findMany({
      where: {
        guildId,
        isActive: true,
        expiresAt: { not: null },
      },
    });
  },

  async revokeCase(caseId: string, revokedBy: string): Promise<ModCase> {
    return prisma.modCase.update({
      where: { id: caseId },
      data: {
        isActive: false,
        reason: 'Revoked by ' + revokedBy,
      },
    });
  },

  async checkAutoMod(guildId: string, userId: string): Promise<{ action: 'mute' | 'ban' | null; reason?: string }> {
    const config = await getGuildConfig(guildId);
    if (!config) return { action: null };

    const activeWarns = await prisma.modCase.count({
      where: {
        guildId,
        targetId: userId,
        action: ModAction.WARN,
        isActive: true,
      },
    });

    const maxWarnsBeforeBan = config.maxWarnsBeforeBan;
    if (maxWarnsBeforeBan && activeWarns >= maxWarnsBeforeBan) {
      return { action: 'ban', reason: `Auto-ban: Exceeded ${maxWarnsBeforeBan} warnings` };
    }

    const maxWarnsBeforeMute = config.maxWarnsBeforeMute;
    if (maxWarnsBeforeMute && activeWarns >= maxWarnsBeforeMute) {
      return { action: 'mute', reason: `Auto-mute: Exceeded ${maxWarnsBeforeMute} warnings` };
    }

    return { action: null };
  }
};
