import { prisma } from '../../../services/database.js';
import { logger } from '../../../services/logger.js';
import { PayoutStatus } from '@prisma/client';
import { createObjectCsvStringifier } from 'csv-writer';

export const payoutService = {
    async calculatePayouts(campaignId: string): Promise<number> {
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { submissions: true }
        });

        if (!campaign) return 0;

        const cpmRate = campaign.cpmRate ? Number(campaign.cpmRate) : 0;
        const payPerApproved = campaign.payPerApproved ? Number(campaign.payPerApproved) : 0;

        if (cpmRate <= 0 && payPerApproved <= 0) return 0;

        const approvedSubmissions = campaign.submissions.filter(s => s.status === 'APPROVED');
        if (approvedSubmissions.length === 0) return 0;

        const minViewsPerVideo = Number(campaign.minViewsPerVideo || 0);
        const maxViewsPerVideo = Number(campaign.maxViewsPerVideo || 0);
        const minViewsPerCreator = Number(campaign.minViewsPerCreator || 0);
        const maxViewsPerCreator = Number(campaign.maxViewsPerCreator || 0);
        const minViewsPerCampaign = Number(campaign.minViewsPerCampaign || 0);
        const maxViewsPerCampaign = Number(campaign.maxViewsPerCampaign || 0);

        // Calculate per-user effective views and approved counts
        const userStats = new Map<string, { approvedCount: number; views: number }>();

        for (const sub of approvedSubmissions) {
            let views = Number(sub.viewsCount || 0);
            if (minViewsPerVideo > 0 && views < minViewsPerVideo) {
                views = 0;
            }
            if (maxViewsPerVideo > 0 && views > maxViewsPerVideo) {
                views = maxViewsPerVideo;
            }
            
            const stats = userStats.get(sub.userId) || { approvedCount: 0, views: 0 };
            stats.approvedCount += 1;
            stats.views += views;
            userStats.set(sub.userId, stats);
        }

        let createdCount = 0;

        for (const [userId, stats] of userStats.entries()) {
            let effectiveViews = stats.views;
            if (minViewsPerCreator > 0 && effectiveViews < minViewsPerCreator) {
                effectiveViews = 0;
            }
            if (maxViewsPerCreator > 0 && effectiveViews > maxViewsPerCreator) {
                effectiveViews = maxViewsPerCreator;
            }

            let totalEarned = 0;
            if (cpmRate > 0) {
                totalEarned += (effectiveViews / 1000) * cpmRate;
            }
            if (payPerApproved > 0) {
                totalEarned += stats.approvedCount * payPerApproved;
            }

            const existingPayouts = await prisma.payout.findMany({
                where: { campaignId, userId }
            });

            const alreadyRecorded = existingPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
            const toRecord = totalEarned - alreadyRecorded;

            if (toRecord > 0) {
                await prisma.payout.create({
                    data: {
                        guildId: campaign.guildId,
                        userId,
                        campaignId,
                        amount: toRecord,
                        status: 'PENDING'
                    }
                });
                createdCount++;
            }
        }

        return createdCount;
    },

    async approvePayout(payoutId: string, processedBy: string): Promise<void> {
        await prisma.payout.update({
            where: { id: payoutId },
            data: { status: 'COMPLETED' }
        });
    },

    async getUserPayouts(guildId: string, userId: string) {
        return prisma.payout.findMany({
            where: { guildId, userId },
            include: { campaign: true }
        });
    },

    async getPendingPayouts(guildId: string) {
        return prisma.payout.findMany({
            where: { guildId, status: 'PENDING' },
            include: { campaign: true }
        });
    },

    async getPayoutSummary(guildId: string, userId: string) {
        const payouts = await this.getUserPayouts(guildId, userId);
        
        const summary = {
            total: 0,
            pending: 0,
            completed: 0
        };

        for (const payout of payouts) {
            const amount = Number(payout.amount);
            summary.total += amount;
            if (payout.status === 'PENDING') summary.pending += amount;
            if (payout.status === 'COMPLETED') summary.completed += amount;
        }

        return summary;
    },

    async exportPayouts(guildId: string, filters: { campaignId?: string, status?: PayoutStatus }): Promise<string | null> {
        const where: any = { guildId };
        if (filters.campaignId) where.campaignId = filters.campaignId;
        if (filters.status) where.status = filters.status;

        const payouts = await prisma.payout.findMany({
            where,
            include: { campaign: true }
        });

        if (payouts.length === 0) return null;

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'id', title: 'PAYOUT_ID' },
                { id: 'userId', title: 'USER_ID' },
                { id: 'campaign', title: 'CAMPAIGN' },
                { id: 'amount', title: 'AMOUNT' },
                { id: 'status', title: 'STATUS' },
                { id: 'createdAt', title: 'CREATED_AT' }
            ]
        });

        const records = payouts.map(p => ({
            id: p.id,
            userId: p.userId,
            campaign: p.campaign?.name || 'N/A',
            amount: Number(p.amount),
            status: p.status,
            createdAt: p.createdAt.toISOString()
        }));

        return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    }
};
