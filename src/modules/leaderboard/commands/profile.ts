import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import prisma from '../../../services/database.js';
import { getUserRank } from '../services/leaderboardService.js';
import logger from '../../../services/logger.js';
import { ensureMember } from '../../../utils/helpers.js';
import COLORS from '../../../utils/colors.js';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View a user\'s profile and stats')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to view')
                .setRequired(false)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply();
            
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guildId!;
            
            await ensureMember(guildId, targetUser.id);

            const member = await prisma.member.findUnique({
                where: { guildId_userId: { guildId, userId: targetUser.id } },
                include: { 
                    user: true,
                    memberBadges: {
                        include: { badge: true }
                    }
                }
            });

            if (!member) {
                await interaction.editReply({ content: 'Could not find profile for this user.' });
                return;
            }

            const rank = await getUserRank(guildId, targetUser.id);
            const successRate = member.totalSubmissions > 0 
                ? Math.round((member.approvedSubmissions / member.totalSubmissions) * 100) 
                : 0;

            const nextLevelXp = (member.level + 1) * 1000; // Mock calculation, replace with actual XP engine
            const progress = Math.min(Math.max(Math.round((member.totalXp / nextLevelXp) * 10), 0), 10);
            const progressBar = '█'.repeat(progress) + '░'.repeat(10 - progress);

            const badges = member.memberBadges.map((mb: any) => mb.badge.emoji || mb.badge.name).join(' ') || 'No badges yet';

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s Profile`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setColor(COLORS.PRIMARY)
                .addFields(
                    { name: '📊 Rank', value: rank ? `#${rank}` : 'Unranked', inline: true },
                    { name: '⭐ Level', value: `${member.level}`, inline: true },
                    { name: '✨ XP', value: `${member.totalXp} / ${nextLevelXp}\n\`${progressBar}\``, inline: false },
                    { name: '📈 Submissions', value: `Total: ${member.totalSubmissions}\nApproved: ${member.approvedSubmissions}\nSuccess Rate: ${successRate}%`, inline: true },
                    { name: '🏅 Badges', value: badges, inline: false }
                )
                .setFooter({ text: `Joined Viralytics` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error executing profile command', error);
            await interaction.editReply({ content: 'An error occurred while fetching the profile.' });
        }
    }
};

export default command;
