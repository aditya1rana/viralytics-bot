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

      const embed = new EmbedBuilder()
        .setTitle(`Ticket created: ${subject}`)
        .setDescription(`Welcome <@${user.id}>!\n\nPlease describe your issue in detail. A staff member will be with you shortly.`)
        .setColor(COLORS.primary);

      const claimButton = new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim Ticket')
        .setEmoji('✋')
        .setStyle(ButtonStyle.Primary);

      const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton, closeButton);

      await channel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row] });

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
