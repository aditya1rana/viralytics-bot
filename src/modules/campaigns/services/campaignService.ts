// src/modules/campaigns/services/campaignService.ts
import prisma from '../../../services/database.js';
import { Campaign, CampaignStatus, Platform } from '@prisma/client';

export class CampaignService {
    static async createCampaign(
        guildId: string,
        data: {
            name: string;
            description?: string;
            platforms?: Platform[];
            payPerApproved?: number;
            startsAt?: Date;
            endsAt?: Date;
            maxSubmissionsPerUser?: number;
            maxTotalSubmissions?: number;
            createdBy: string;
        }
    ) {
        return prisma.campaign.create({
            data: {
                guildId,
                name: data.name,
                description: data.description,
                platforms: data.platforms,
                payPerApproved: data.payPerApproved,
                startsAt: data.startsAt,
                endsAt: data.endsAt,
                maxSubmissionsPerUser: data.maxSubmissionsPerUser,
                maxTotalSubmissions: data.maxTotalSubmissions,
                createdBy: data.createdBy,
                status: CampaignStatus.DRAFT
            }
        });
    }

    static async editCampaign(campaignId: string, data: any) {
        return prisma.campaign.update({
            where: { id: campaignId },
            data
        });
    }

    static async getCampaignById(campaignId: string): Promise<Campaign | null> {
        return prisma.campaign.findUnique({
            where: { id: campaignId }
        });
    }

    static async getCampaignByName(guildId: string, name: string): Promise<Campaign | null> {
        return prisma.campaign.findFirst({
            where: { guildId, name }
        });
    }

    static async listCampaigns(guildId: string) {
        return prisma.campaign.findMany({
            where: { guildId }
        });
    }

    static async archiveCampaign(campaignId: string) {
        return prisma.campaign.update({
            where: { id: campaignId },
            data: {
                status: CampaignStatus.ARCHIVED,
                archivedAt: new Date()
            }
        });
    }

    static async closeCampaign(campaignId: string) {
        return prisma.campaign.update({
            where: { id: campaignId },
            data: {
                status: CampaignStatus.CLOSED,
                closedAt: new Date()
            }
        });
    }

    static async getCampaignStats(campaignId: string) {
        const stats = await prisma.submission.groupBy({
            by: ['status'],
            where: { campaignId },
            _count: { _all: true }
        });
        
        const totalSubmissions = stats.reduce((acc: number, curr: any) => acc + curr._count._all, 0);
        const approved = stats.find((s: any) => s.status === 'APPROVED')?._count._all || 0;
        const rejected = stats.find((s: any) => s.status === 'REJECTED')?._count._all || 0;
        const pending = stats.find((s: any) => s.status === 'PENDING')?._count._all || 0;

        const uniqueClippers = await prisma.submission.groupBy({
            by: ['userId'],
            where: { campaignId }
        });

        return {
            totalSubmissions,
            approved,
            rejected,
            pending,
            activeClippers: uniqueClippers.length
        };
    }

    static async searchCampaigns(guildId: string, query: string) {
        return prisma.campaign.findMany({
            where: {
                guildId,
                name: {
                    contains: query,
                    mode: 'insensitive'
                }
            },
            take: 25
        });
    }
}
