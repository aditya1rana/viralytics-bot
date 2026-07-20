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

        if (!campaign || !campaign.payPerApproved) return 0;
        const amountPerApproval = Number(campaign.payPerApproved);

        const approvedSubmissions = campaign.submissions.filter(s => s.status === 'APPROVED');
        
        let createdCount = 0;
        
        const userSubmissionCounts = new Map<string, number>();
        for (const sub of approvedSubmissions) {
            userSubmissionCounts.set(sub.userId, (userSubmissionCounts.get(sub.userId) || 0) + 1);
        }
        
        for (const [userId, count] of userSubmissionCounts.entries()) {
            const existingPayouts = await prisma.payout.findMany({
                where: { campaignId, userId }
            });
            
            const totalEarned = count * amountPerApproval;
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
