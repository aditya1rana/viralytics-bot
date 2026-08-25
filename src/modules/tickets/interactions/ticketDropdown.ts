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

      let aiGreeting = '';
      switch (categoryValue) {
        case 'SUPPORT':
          aiGreeting = `🤖 **Viralytics AI Support**\n\nI'm here to help with general Viralytics and server-related questions.\n\nAsk your question below or click 🧑‍💼 Talk to Moderator if you'd rather speak with the team.`;
          break;
        case 'PAYMENT':
          aiGreeting = `💳 **Viralytics Payment Support**\n\nI can help with general payment and reward questions.\n\nFor account-specific payment issues, click 🧑‍💼 Talk to Moderator.`;
          break;
        case 'CAMPAIGN_HELP':
          aiGreeting = `🎬 **Viralytics Campaign Support**\n\nI can help with campaign rules, clipping, submissions and campaign-related questions.\n\nNeed a human? Click 🧑‍💼 Talk to Moderator.`;
          break;
        case 'PARTNERSHIP':
          aiGreeting = `🤝 **Viralytics Partnerships**\n\nTell us about your company, service, creator profile or partnership idea.\n\nA member of the team can take over when needed.`;
          break;
        case 'BUG_REPORT':
          aiGreeting = `🐛 **Viralytics Bug Report**\n\nPlease describe the issue and provide screenshots, videos, errors or relevant links if available.\n\nThe AI will help collect the details before escalating to the team when needed.`;
          break;
        default:
          aiGreeting = `🤖 **Viralytics AI Support**\n\nHow can I help you today?\nClick 🧑‍💼 Talk to Moderator for human support.`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Ticket created: ${subject}`)
        .setDescription(`Welcome <@${user.id}>!\n\n${aiGreeting}`)
        .setColor(COLORS.primary);

      const moderatorButton = new ButtonBuilder()
        .setCustomId('ai_request_human')
        .setLabel('Talk to Moderator')
        .setEmoji('🧑‍💼')
        .setStyle(ButtonStyle.Secondary);

      const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      // AI Staff Controls
      const aiOnButton = new ButtonBuilder()
        .setCustomId('ai_on')
        .setLabel('AI ON')
        .setEmoji('🤖')
        .setStyle(ButtonStyle.Success);

      const aiOffButton = new ButtonBuilder()
        .setCustomId('ai_off')
        .setLabel('AI OFF')
        .setEmoji('🔇')
        .setStyle(ButtonStyle.Danger);

      const aiStatusButton = new ButtonBuilder()
        .setCustomId('ai_status')
        .setLabel('AI STATUS')
        .setEmoji('📊')
        .setStyle(ButtonStyle.Primary);
        
      const aiTakeoverButton = new ButtonBuilder()
        .setCustomId('ai_takeover')
        .setLabel('TAKE OVER')
        .setEmoji('🧑‍💼')
        .setStyle(ButtonStyle.Primary);

      const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(moderatorButton, closeButton);
      const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(aiOnButton, aiOffButton, aiStatusButton, aiTakeoverButton);

      await channel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row1, row2] });

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
