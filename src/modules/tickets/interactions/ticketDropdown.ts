import { StringSelectMenuInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { SelectMenuHandler } from '../../../types/index.js';
import { ticketService } from '../services/ticketService.js';
import embedBuilder from '../../../services/embedBuilder.js';
import logger from '../../../services/logger.js';
import { TicketCategory } from '@prisma/client';
import COLORS from '../../../utils/colors.js';
import { findLogChannel } from '../../../utils/helpers.js';

const handler: SelectMenuHandler = {
  customId: 'ticket_create_select',
  async execute(interaction: StringSelectMenuInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const categoryValue = interaction.values[0] as TicketCategory;
      const guild = interaction.guild;
      const user = interaction.user;

      if (!guild) {
        await interaction.editReply({ content: 'This command can only be used in a server.' });
        return;
      }

      // Find the label for the subject
      const selectMenuComponents = (interaction.message.components[0] as any).components[0] as any;
      const option = selectMenuComponents.options?.find((opt: any) => opt.value === categoryValue);
      const subject = option ? option.label : categoryValue;

      const channel = await ticketService.createTicket(guild, user, categoryValue, subject);

      if (!channel) {
        await interaction.editReply({ content: 'There was an error creating your ticket channel.' });
        return;
      }

      let greeting = '';
      switch (categoryValue) {
        case 'SUPPORT':
          greeting = `**Viralytics Support**\n\nPlease describe your issue and our team will get back to you shortly.`;
          break;
        case 'PAYMENT':
          greeting = `**Viralytics Payment Support**\n\nPlease describe your payment issue and our team will get back to you shortly.`;
          break;
        case 'CAMPAIGN_HELP':
          greeting = `**Viralytics Campaign Support**\n\nPlease describe your campaign issue and our team will get back to you shortly.`;
          break;
        case 'PARTNERSHIP':
          greeting = `**Viralytics Partnerships**\n\nTell us about your company, service, creator profile or partnership idea.`;
          break;
        case 'BUG_REPORT':
          greeting = `**Viralytics Bug Report**\n\nPlease describe the issue and provide screenshots, videos, errors or relevant links if available.`;
          break;
        default:
          greeting = `**Viralytics Support**\n\nHow can we help you today?`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Ticket created: ${subject}`)
        .setDescription(`Welcome <@${user.id}>!\n\n${greeting}`)
        .setColor(COLORS.primary);

      const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton);

      await channel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row1] });

      await interaction.editReply({ content: `Your ticket has been created: <#${channel.id}>` });

      // Log to ticket-logs
      const logChannel = findLogChannel(guild, null, 'ticket-logs');
      if (logChannel) {
        const logEmbed = embedBuilder.info(
          'Ticket Created',
          `**User:** <@${user.id}> (${user.id})\n**Channel:** <#${channel.id}>\n**Category:** ${categoryValue}`
        );
        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      logger.error('Error in ticket create dropdown:', error);
      await interaction.editReply({ content: 'An error occurred while creating your ticket.' }).catch(() => null);
    }
  }
};

export default handler;
