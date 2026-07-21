import { Client, ChannelType } from 'discord.js';
import db from '../../../services/database.js';
import logger from '../../../services/logger.js';
import { buildEmbed } from '../../../services/embedBuilder.js';
import COLORS, { safeResolveColor } from '../../../utils/colors.js';

export const createAnnouncement = async (data: any) => {
    // Map command-friendly fields to DB schema fields
    const dbData = {
        guildId: data.guildId,
        channelId: data.channelId,
        title: data.title,
        content: data.message,
        color: data.color,
        imageUrl: data.imageUrl,
        mentionRoles: data.mentionRoleId ? [data.mentionRoleId] : [],
        scheduledAt: data.scheduledAt,
        isPublished: data.isPublished,
        createdBy: data.createdBy
    };

    return await db.announcement.create({
        data: dbData
    });
};

export const sendAnnouncement = async (client: Client, announcement: any) => {
    try {
        const guild = await client.guilds.fetch(announcement.guildId).catch(() => null);
        if (!guild) return false;

        const channel = await guild.channels.fetch(announcement.channelId).catch(() => null);
        if (!channel || !(channel.isTextBased())) return false;

        const embedData = {
            title: announcement.title,
            description: announcement.content,
            color: safeResolveColor(announcement.color)
        };

        const embed = buildEmbed(embedData);
        if (announcement.imageUrl) {
            embed.setImage(announcement.imageUrl);
        }

        const content = announcement.mentionRoles && announcement.mentionRoles.length > 0 
            ? announcement.mentionRoles.map((rId: string) => {
                if (rId === announcement.guildId) {
                    return '@everyone';
                }
                return `<@&${rId}>`;
            }).join(' ') 
            : undefined;

        const sentMessage = await channel.send({ content, embeds: [embed] });

        if (channel.type === ChannelType.GuildAnnouncement) {
            try {
                await sentMessage.crosspost();
            } catch (err) {
                logger.error('Failed to crosspost announcement', err);
            }
        }

        await db.announcement.update({
            where: { id: announcement.id },
            data: { isPublished: true }
        });

        return true;
    } catch (error) {
        logger.error(`Error sending announcement ${announcement.id}`, error);
        return false;
    }
};

export const listAnnouncements = async (guildId: string, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;
    const announcements = await db.announcement.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
    });
    const total = await db.announcement.count({ where: { guildId } });
    return { announcements, total, pages: Math.ceil(total / limit) };
};

export const deleteAnnouncement = async (id: string) => {
    return await db.announcement.delete({
        where: { id }
    });
};

export const getScheduledAnnouncements = async () => {
    return await db.announcement.findMany({
        where: {
            isPublished: false,
            scheduledAt: {
                lte: new Date()
            }
        }
    });
};
