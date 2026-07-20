import prisma from '../../../services/database.js';
import { cache } from '../../../services/cache.js';
import logger from '../../../services/logger.js';
import { SubmissionStatus, VerificationStatus } from '@prisma/client';

export const getLeaderboard = async (guildId: string, period: string, page: number = 1, pageSize: number = 10) => {
    try {
        const cacheKey = `leaderboard:${guildId}:${period}:${page}`;
        const cached = await cache.get<any>(cacheKey);
        if (cached) return cached;

        let data;
        let total = 0;

        if (period === 'lifetime') {
            const members = await prisma.member.findMany({
                where: { guildId },
                orderBy: { totalSubmissions: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { user: true }
            });
            total = await prisma.member.count({ where: { guildId } });

            data = members.map((m, idx) => ({
                userId: m.userId,
                username: m.user?.username || 'Unknown',
                totalSubmissions: m.totalSubmissions,
                approvedSubmissions: m.approvedSubmissions,
                rank: (page - 1) * pageSize + idx + 1
            }));
        } else {
            const snapshots = await prisma.leaderboardSnapshot.findMany({
                where: { guildId, period },
                orderBy: { submissions: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize
            });
            total = await prisma.leaderboardSnapshot.count({ where: { guildId, period } });

            const userIds = snapshots.map(s => s.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } }
            });
            const userMap = new Map(users.map(u => [u.id, u.username]));

            data = snapshots.map((s, idx) => ({
                userId: s.userId,
                username: userMap.get(s.userId) || 'Unknown',
                totalSubmissions: s.submissions,
                approvedSubmissions: s.approved,
                rank: (page - 1) * pageSize + idx + 1
            }));
        }

        const result = { data, total, page, pageSize };
        await cache.set(cacheKey, JSON.stringify(result), 300); // Cache for 5 mins
        return result;
    } catch (error) {
        logger.error('Error fetching leaderboard', error);
        throw error;
    }
};

export const getUserRank = async (guildId: string, userId: string) => {
    try {
        const member = await prisma.member.findUnique({
            where: { guildId_userId: { guildId, userId } }
        });
        if (!member) return null;

        const rank = await prisma.member.count({
            where: {
                guildId,
                totalSubmissions: { gt: member.totalSubmissions }
            }
        }) + 1;

        return rank;
    } catch (error) {
        logger.error('Error fetching user rank', error);
        return null;
    }
};

export const getServerStats = async (guildId: string) => {
    try {
        const cacheKey = `server_stats:${guildId}`;
        const cached = await cache.get<any>(cacheKey);
        if (cached) return cached;

        const totalMembers = await prisma.member.count({ where: { guildId } });
        const verifiedMembers = await prisma.member.count({ where: { guildId, verificationStatus: VerificationStatus.VERIFIED } });
        
        const totalSubmissions = await prisma.submission.count({ where: { guildId } });
        const approvedSubmissions = await prisma.submission.count({ where: { guildId, status: SubmissionStatus.APPROVED } });
        const rejectedSubmissions = await prisma.submission.count({ where: { guildId, status: SubmissionStatus.REJECTED } });

        // Count submissions per campaign to find the top one
        const campaignSubmissions = await prisma.submission.groupBy({
            by: ['campaignId'],
            where: { guildId },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 1
        });

        let topCampaignName = 'None';
        let topCampaignCount = 0;

        if (campaignSubmissions.length > 0) {
            const campaignId = campaignSubmissions[0].campaignId;
            const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
            if (campaign) {
                topCampaignName = campaign.name;
                topCampaignCount = campaignSubmissions[0]._count.id;
            }
        }

        const topClipperWeek = await prisma.leaderboardSnapshot.findFirst({
            where: { guildId, period: 'weekly' },
            orderBy: { submissions: 'desc' }
        });

        let topClipperName = 'None';
        let topClipperScore = 0;

        if (topClipperWeek) {
            const user = await prisma.user.findUnique({ where: { id: topClipperWeek.userId } });
            if (user) {
                topClipperName = user.username;
                topClipperScore = topClipperWeek.submissions;
            }
        }

        const stats = {
            totalMembers,
            verifiedMembers,
            totalSubmissions,
            approvedSubmissions,
            rejectedSubmissions,
            topCampaignName,
            topCampaignCount,
            topClipperName,
            topClipperScore
        };

        await cache.set(cacheKey, JSON.stringify(stats), 300);
        return stats;
    } catch (error) {
        logger.error('Error fetching server stats', error);
        throw error;
    }
};

export const updateLeaderboardSnapshot = async (guildId: string) => {
    try {
        logger.info(`Updating leaderboard snapshots for guild ${guildId}`);
    } catch (error) {
        logger.error('Error updating leaderboard snapshot', error);
    }
};
