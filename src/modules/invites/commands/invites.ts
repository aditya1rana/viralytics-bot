import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits, 
  userMention,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  TextChannel
} from 'discord.js';
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
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Post the invites & leaderboard check panel (Admin only).')
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      if (subcommand === 'check') {
        await interaction.deferReply();
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

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'leaderboard') {
        await interaction.deferReply();
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

      } else if (subcommand === 'add-bonus') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          const errorEmbed = embedBuilder.error('You do not have permission to add bonus invites.');
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const targetUser = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);

        await ensureMember(guildId, targetUser.id);
        await InviteService.addBonusInvites(guildId, targetUser.id, amount);

        const embed = embedBuilder.success(`Successfully added ${amount} bonus invites to ${targetUser.username}.`);
        await interaction.editReply({ embeds: [embed] });
      } else if (subcommand === 'panel') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          const errorEmbed = embedBuilder.error('You do not have permission to post this panel.');
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          return;
        }

        const panelEmbed = new EmbedBuilder()
          .setTitle('📩 Invites & Leaderboard Panel')
          .setDescription('Use the buttons below to check your stats or view the server leaderboard.\n\n' +
                          '👉 **Check Stats**: View your total, valid, left, and fake invites.\n' +
                          '👉 **Leaderboard**: See the top members by valid invites.')
          .setColor('#6C5CE7' as any)
          .setFooter({ text: 'Viralytics Invite System' });

        const checkBtn = new ButtonBuilder()
          .setCustomId('invites_panel_check')
          .setLabel('Check Stats')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📩');

        const leaderboardBtn = new ButtonBuilder()
          .setCustomId('invites_panel_leaderboard')
          .setLabel('Leaderboard')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🏆');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(checkBtn, leaderboardBtn);

        await (interaction.channel as TextChannel).send({ embeds: [panelEmbed], components: [row] });
        await interaction.reply({ content: '✅ Invites & Leaderboard panel posted!', ephemeral: true });
      }
    } catch (error) {
      logger.error('Error executing invites command:', error);
      const errorEmbed = embedBuilder.error('An error occurred while processing the command.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};

export default invitesCommand;
