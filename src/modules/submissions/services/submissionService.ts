import { SubmissionStatus } from '@prisma/client';
import { prisma } from '../../../services/database.js';
import { logger } from '../../../services/logger.js';
import { validateAndNormalizeUrl } from '../../../services/urlValidator.js';
import { generateShortId } from '../../../utils/helpers.js';

export const submissionService = {
  async findDuplicate(normalizedUrl: string, campaignId: string) {
    return prisma.submission.findFirst({
      where: {
        normalizedUrl,
        campaignId,
      }
    });
  },

  async createSubmission(data: {
    guildId: string;
    userId: string;
    campaignId: string;
    originalUrl: string;
    notes?: string;
  }) {
    const result = validateAndNormalizeUrl(data.originalUrl);
    if (!result.valid || !result.normalizedUrl || !result.platform) {
      throw new Error(result.error || 'Invalid URL.');
    }
    const { normalizedUrl, platform } = result;
    
    // Check for duplicates
    const duplicate = await this.findDuplicate(normalizedUrl, data.campaignId);
    if (duplicate) {
      throw new Error(`Duplicate submission found. ID: ${duplicate.shortId}`);
    }

    const shortId = await generateShortId();

    return prisma.$transaction(async (tx) => {
      const submission = await tx.submission.create({
        data: {
          shortId,
          guildId: data.guildId,
          userId: data.userId,
          campaignId: data.campaignId,
          originalUrl: data.originalUrl,
          normalizedUrl,
          platform: platform,
          status: SubmissionStatus.PENDING,
          notes: data.notes,
        },
        include: {
          campaign: true,
          user: true,
        }
      });

      // Update Member stats
      await tx.member.update({
        where: {
          guildId_userId: {
            guildId: data.guildId,
            userId: data.userId,
          }
        },
        data: {
          totalSubmissions: { increment: 1 }
        }
      });

      return submission;
    });
  },

  async approveSubmission(id: string, reviewerId: string) {
    return prisma.$transaction(async (tx) => {
      const submission = await tx.submission.update({
        where: { id },
        data: {
          status: SubmissionStatus.APPROVED,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
        include: { user: true, campaign: true }
      });

      await tx.member.update({
        where: {
          guildId_userId: {
            guildId: submission.guildId,
            userId: submission.userId,
          }
        },
        data: {
          approvedSubmissions: { increment: 1 }
        }
      });

      return submission;
    });
  },

  async rejectSubmission(id: string, reviewerId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.submission.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Submission not found.');
      }

      const notes = reason ? `${existing.notes || ''}\nRejection Reason: ${reason}`.trim() : existing.notes;

      const submission = await tx.submission.update({
        where: { id },
        data: {
          status: SubmissionStatus.REJECTED,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          notes,
        },
        include: { user: true, campaign: true }
      });

      await tx.member.update({
        where: {
          guildId_userId: {
            guildId: submission.guildId,
            userId: submission.userId,
          }
        },
        data: {
          rejectedSubmissions: { increment: 1 }
        }
      });

      return submission;
    });
  },

  async deleteSubmission(id: string) {
    return prisma.submission.update({
      where: { id },
      data: {
        status: SubmissionStatus.DELETED,
      }
    });
  },

  async getUserSubmissions(guildId: string, userId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where: { guildId, userId, status: { not: SubmissionStatus.DELETED } },
        include: { campaign: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.submission.count({
        where: { guildId, userId, status: { not: SubmissionStatus.DELETED } },
      }),
    ]);

    return { items, total, totalPages: Math.ceil(total / pageSize) };
  },

  async searchSubmissions(guildId: string, filters: { url?: string; userId?: string; campaignName?: string; shortId?: string }) {
    const where: any = { guildId, status: { not: SubmissionStatus.DELETED } };
    
    if (filters.url) {
      where.originalUrl = { contains: filters.url };
    }
    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.campaignName) {
      where.campaign = { name: { contains: filters.campaignName, mode: 'insensitive' } };
    }
    if (filters.shortId) {
      where.shortId = filters.shortId;
    }

    return prisma.submission.findMany({
      where,
      include: { campaign: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async getCampaignSubmissions(campaignId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where: { campaignId, status: { not: SubmissionStatus.DELETED } },
        include: { user: true, campaign: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.submission.count({
        where: { campaignId, status: { not: SubmissionStatus.DELETED } },
      }),
    ]);

    return { items, total, totalPages: Math.ceil(total / pageSize) };
  },

  async getSubmissionById(id: string) {
    return prisma.submission.findFirst({
      where: {
        OR: [
          { id },
          { shortId: id }
        ]
      },
      include: { campaign: true, user: true }
    });
  }
};
