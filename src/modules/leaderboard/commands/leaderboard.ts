import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { getLeaderboard } from '../services/leaderboardService.js';
import { paginate } from '../../../services/pagination.js';
import logger from '../../../services/logger.js';
import COLORS from '../../../utils/colors.js';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top clippers in the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('period')
                .setDescription('The time period to view')
                .setRequired(false)
                .addChoices(
                    { name: 'Daily', value: 'daily' },
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'Monthly', value: 'monthly' },
                    { name: 'Lifetime', value: 'lifetime' }
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply();
            const guildId = interaction.guildId!;
            const period = interaction.options.getString('period') || 'lifetime';

            const pageSize = 10;
            const maxPages = 10; // Generate up to 10 pages for pagination buffer
            const embeds = [];

            for (let page = 1; page <= maxPages; page++) {
                const leaderboard = await getLeaderboard(guildId, period, page, pageSize);
                if (!leaderboard.data.length && page > 1) break;

                const embed = new EmbedBuilder()
                    .setTitle(`🏆 ${period.charAt(0).toUpperCase() + period.slice(1)} Leaderboard`)
                    .setColor(COLORS.PRIMARY)
                    .setDescription(leaderboard.data.length === 0 ? 'No data available.' : 'Top clippers sorted by submissions.');

                let description = '';
                leaderboard.data.forEach((entry: any) => {
                    const successRate = entry.totalSubmissions > 0 
                        ? Math.round((entry.approvedSubmissions / entry.totalSubmissions) * 100) 
                        : 0;
                    description += `**#${entry.rank}** ${entry.username} - ${entry.totalSubmissions} Submissions (${entry.approvedSubmissions} Approved, ${successRate}% Success)\n`;
                });

                if (description) embed.setDescription(description);
                embed.setFooter({ text: `Page ${page} of ${Math.ceil(leaderboard.total / pageSize) || 1}` });
                
                embeds.push(embed);

                if (page * pageSize >= leaderboard.total) break;
            }

            if (embeds.length === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setTitle(`🏆 ${period.charAt(0).toUpperCase() + period.slice(1)} Leaderboard`)
                    .setColor(COLORS.PRIMARY)
                    .setDescription('No data available for this period.');
                await interaction.editReply({ embeds: [emptyEmbed] });
                return;
            }

            if (embeds.length === 1) {
                await interaction.editReply({ embeds: [embeds[0]] });
                return;
            }

            await paginate(interaction, embeds);
        } catch (error) {
            logger.error('Error executing leaderboard command', error);
            await interaction.editReply({ content: 'An error occurred while fetching the leaderboard.' });
        }
    }
};

export default command;
