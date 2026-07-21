import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { ticketService } from '../services/ticketService.js';
import prisma from '../../../services/database.js';
import embedBuilder from '../../../services/embedBuilder.js';
import COLORS from '../../../utils/colors.js';
import logger from '../../../services/logger.js';
import { TICKET_CATEGORIES } from '../../../utils/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Create the ticket panel (Admin only)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption(option =>
          option.setName('reason').setDescription('Reason for closing').setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rename')
        .setDescription('Rename the current ticket')
        .addStringOption(option =>
          option.setName('name').setDescription('New ticket name').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a user to the ticket')
        .addUserOption(option =>
          option.setName('user').setDescription('User to add').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from the ticket')
        .addUserOption(option =>
          option.setName('user').setDescription('User to remove').setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'panel') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle('🎫 Support Tickets')
          .setDescription('Select a category from the dropdown below to create a ticket.')
          .setColor(COLORS.primary);

        const options = [
          { label: 'Support', description: 'General support and inquiries', value: 'SUPPORT', emoji: '🛠️' },
          { label: 'Payment', description: 'Billing and payment issues', value: 'PAYMENT', emoji: '💳' },
          { label: 'Campaign Help', description: 'Assistance with your campaigns', value: 'CAMPAIGN_HELP', emoji: '📈' },
          { label: 'Partnership', description: 'Partnership inquiries', value: 'PARTNERSHIP', emoji: '🤝' },
          { label: 'Bug Report', description: 'Report a bug or glitch', value: 'BUG_REPORT', emoji: '🐛' },
          { label: 'Other', description: 'Other inquiries', value: 'OTHER', emoji: '❓' },
        ];

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('ticket_create_select')
          .setPlaceholder('Select a ticket category')
          .addOptions(options);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await (interaction.channel as any)?.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Ticket panel created successfully.', ephemeral: true });
      }

      else if (subcommand === 'close') {
        const ticket = await prisma.ticket.findFirst({
          where: { channelId: interaction.channelId, status: { not: 'CLOSED' } },
        });

        if (!ticket) {
          await interaction.reply({ content: 'This channel is not an active ticket.', ephemeral: true });
          return;
        }

        const reason = interaction.options.getString('reason') || 'No reason provided';
        await interaction.reply({ content: 'Closing ticket in 5 seconds...', ephemeral: false });
        
        await ticketService.closeTicket(interaction.channel as TextChannel, interaction.user, reason);
      }

      else if (subcommand === 'rename') {
        const ticket = await prisma.ticket.findFirst({
          where: { channelId: interaction.channelId, status: { not: 'CLOSED' } },
        });

        if (!ticket) {
          await interaction.reply({ content: 'This channel is not an active ticket.', ephemeral: true });
          return;
        }

        const newName = interaction.options.getString('name', true);
        await (interaction.channel as TextChannel).setName(newName);
        await interaction.reply({ content: `Ticket renamed to ${newName}`, ephemeral: false });
      }

      else if (subcommand === 'add') {
        const ticket = await prisma.ticket.findFirst({
          where: { channelId: interaction.channelId, status: { not: 'CLOSED' } },
        });

        if (!ticket) {
          await interaction.reply({ content: 'This channel is not an active ticket.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('user', true);
        const channel = interaction.channel as TextChannel;
        await channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });

        await interaction.reply({ content: `Added <@${user.id}> to the ticket.`, ephemeral: false });
      }

      else if (subcommand === 'remove') {
        const ticket = await prisma.ticket.findFirst({
          where: { channelId: interaction.channelId, status: { not: 'CLOSED' } },
        });

        if (!ticket) {
          await interaction.reply({ content: 'This channel is not an active ticket.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('user', true);
        const channel = interaction.channel as TextChannel;
        await channel.permissionOverwrites.edit(user.id, {
          ViewChannel: false,
          SendMessages: false,
          ReadMessageHistory: false,
        });

        await interaction.reply({ content: `Removed <@${user.id}> from the ticket.`, ephemeral: false });
      }
    } catch (error) {
      logger.error('Error executing ticket command:', error);
      await interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true }).catch(() => null);
    }
  },
} as Command;
