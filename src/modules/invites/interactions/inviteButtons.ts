import { ButtonHandler } from '../../../types/index.js';
import { InviteService } from '../services/inviteService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { prisma } from '../../../services/database.js';
import { userMention } from 'discord.js';
import { logger } from '../../../services/logger.js';

export const invitesPanelCheckHandler: ButtonHandler = {
  customId: 'invites_panel_check',
  async execute(interaction) {
    if (!interaction.guild) return;
    const guildId = interaction.guild.id;
    const targetUser = interaction.user;

    try {
      await interaction.deferReply({ ephemeral: true });
      const stats = await InviteService.getInviteStats(guildId, targetUser.id);
      
      const invitedUsers = await prisma.invite.findMany({
        where: { guildId, inviterId: targetUser.id, status: 'VALID' },
        orderBy: { joinedAt: 'desc' },
        take: 5,
        select: { inviteeId: true, joinedAt: true }
      });

      let invitedText = invitedUsers.length > 0 
        ? invitedUsers.map(i => `${userMention(i.inviteeId)} (Joined <t:${Math.floor(i.joinedAt.getTime() / 1000)}:R>)`).join('\n')
        : 'None yet.';

      const embed = embedBuilder.create({
        title: `Invite Stats for ${targetUser.username}`,
        description: `Here are your current invite statistics.`,
        fields: [
          { name: 'Total Invites', value: `${stats.total}`, inline: true },
          { name: 'Valid Invites', value: `${stats.valid}`, inline: true },
          { name: 'Left', value: `${stats.left}`, inline: true },
          { name: 'Fake/New', value: `${stats.fake}`, inline: true },
          { name: 'Bonus', value: `${stats.bonus}`, inline: true },
          { name: 'Recent Valid Joins (Top 5)', value: invitedText, inline: false }
        ]
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error handling invites_panel_check button:', error);
      const errorEmbed = embedBuilder.error('An error occurred while checking your invites.');
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};

export const invitesPanelLeaderboardHandler: ButtonHandler = {
  customId: 'invites_panel_leaderboard',
  async execute(interaction) {
    if (!interaction.guild) return;
    const guildId = interaction.guild.id;

    try {
      await interaction.deferReply({ ephemeral: true });
      const topMembers = await InviteService.getInviteLeaderboard(guildId, 10);

      if (!topMembers || topMembers.length === 0) {
        const embed = embedBuilder.error('No invite data found for this server.');
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      let description = '';
      for (let i = 0; i < topMembers.length; i++) {
        const m = topMembers[i];
        const valid = (m.totalInvites + m.bonusInvites) - m.leftInvites - m.fakeInvites;
        description += `**${i + 1}.** ${userMention(m.userId)} - ${valid} Valid (${m.totalInvites} Total, ${m.bonusInvites} Bonus, ${m.leftInvites} Left, ${m.fakeInvites} Fake)\n`;
      }

      const embed = embedBuilder.create({
        title: 'Invite Leaderboard',
        description
      });
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error handling invites_panel_leaderboard button:', error);
      const errorEmbed = embedBuilder.error('An error occurred while fetching the leaderboard.');
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};

export default [invitesPanelCheckHandler, invitesPanelLeaderboardHandler];
