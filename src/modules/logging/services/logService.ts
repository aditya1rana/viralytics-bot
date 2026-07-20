import { EmbedBuilder, Guild } from 'discord.js';
import { getGuildConfig } from '../../../services/configManager.js';
import { logger } from '../../../services/logger.js';

export type LogChannelType = 'verification' | 'ticket' | 'moderation' | 'payout' | 'general';

export async function sendLog(guild: Guild, channelType: LogChannelType, embed: EmbedBuilder): Promise<void> {
    try {
        const config = await getGuildConfig(guild.id);
        if (!config) return;

        let channelId: string | null = null;
        switch (channelType) {
            case 'verification':
                channelId = (config as any).verificationLogChannelId;
                break;
            case 'ticket':
                channelId = (config as any).ticketLogChannelId;
                break;
            case 'moderation':
                channelId = (config as any).modLogChannelId || (config as any).moderationLogChannelId;
                break;
            case 'payout':
                channelId = (config as any).payoutLogChannelId;
                break;
            case 'general':
                channelId = (config as any).logChannelId;
                break;
        }

        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        logger.error(`Error in sendLog: ${error}`);
    }
}
