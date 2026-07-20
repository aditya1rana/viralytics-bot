import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { getServerStats } from '../services/leaderboardService.js';
import logger from '../../../services/logger.js';
import colors from '../../../utils/colors.js';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View server-wide statistics'),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply();
            const guildId = interaction.guildId!;

            const stats = await getServerStats(guildId);

            const embed = new EmbedBuilder()
                .setTitle(`📊 Server Statistics for ${interaction.guild?.name}`)
                .setColor(colors.primary || '#2ecc71')
                .setThumbnail(interaction.guild?.iconURL() || null)
                .addFields(
                    { name: '👥 Members', value: `Total: **${stats.totalMembers}**\nVerified: **${stats.verifiedMembers}**`, inline: true },
                    { name: '📈 Submissions', value: `Total: **${stats.totalSubmissions}**\nApproved: **${stats.approvedSubmissions}**\nRejected: **${stats.rejectedSubmissions}**`, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '🔥 Top Campaign', value: `${stats.topCampaignName} (${stats.topCampaignCount} subs)`, inline: true },
                    { name: '👑 Top Clipper (Weekly)', value: `${stats.topClipperName} (${stats.topClipperScore} pts)`, inline: true }
                )
                .setFooter({ text: 'Stats are cached for 5 minutes' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error executing stats command', error);
            await interaction.editReply({ content: 'An error occurred while fetching server statistics.' });
        }
    }
};

export default command;
