import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, userMention } from 'discord.js';
import { Command } from '../../../types/index.js';
import { InviteService } from '../services/inviteService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { logger } from '../../../services/logger.js';
import { prisma } from '../../../services/database.js';
import { ensureMember } from '../../../utils/helpers.js';

const invitesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Manage and view invite statistics.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check invite statistics for a user.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to check invites for (defaults to you)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View the invite leaderboard for the server.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-bonus')
        .setDescription('Add bonus invites to a user (Admin only).')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to add bonus invites to')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('The amount of bonus invites to add (can be negative)')
            .setRequired(true)
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      if (subcommand === 'check') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        await ensureMember(guildId, targetUser.id);

        const stats = await InviteService.getInviteStats(guildId, targetUser.id);
        
        // Fetch top 5 invited people by this user
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
          description: `Here are the current invite statistics.`,
          fields: [
            { name: 'Total Invites', value: `${stats.total}`, inline: true },
            { name: 'Valid Invites', value: `${stats.valid}`, inline: true },
            { name: 'Left', value: `${stats.left}`, inline: true },
            { name: 'Fake/New', value: `${stats.fake}`, inline: true },
            { name: 'Bonus', value: `${stats.bonus}`, inline: true },
            { name: 'Recent Valid Joins (Top 5)', value: invitedText, inline: false }
          ]
        });

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'leaderboard') {
        const topMembers = await InviteService.getInviteLeaderboard(guildId, 10);

        if (!topMembers || topMembers.length === 0) {
          const embed = embedBuilder.error('No invite data found for this server.');
          await interaction.reply({ embeds: [embed] });
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
        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'add-bonus') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          const errorEmbed = embedBuilder.error('You do not have permission to add bonus invites.');
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          return;
        }

        const targetUser = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);

        await ensureMember(guildId, targetUser.id);
        await InviteService.addBonusInvites(guildId, targetUser.id, amount);

        const embed = embedBuilder.success(`Successfully added ${amount} bonus invites to ${targetUser.username}.`);
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Error executing invites command:', error);
      const errorEmbed = embedBuilder.error('An error occurred while processing the command.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

export default invitesCommand;
