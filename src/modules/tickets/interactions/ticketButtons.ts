import { ButtonInteraction, TextChannel, PermissionFlagsBits } from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import prisma from '../../../services/database.js';
import { ticketService } from '../services/ticketService.js';
import logger from '../../../services/logger.js';
import { TicketStatus } from '@prisma/client';
import { AttachmentBuilder } from 'discord.js';

const claimHandler: ButtonHandler = {
  customId: 'ticket_claim',
  async execute(interaction: ButtonInteraction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
        await interaction.reply({ content: 'You do not have permission to claim tickets.', ephemeral: true });
        return;
      }

      const ticket = await prisma.ticket.findFirst({
        where: { channelId: interaction.channelId, status: { not: TicketStatus.CLOSED } },
      });

      if (!ticket) {
        await interaction.reply({ content: 'This is not an active ticket.', ephemeral: true });
        return;
      }

      if (ticket.claimedById) {
        await interaction.reply({ content: `Ticket is already claimed by <@${ticket.claimedById}>.`, ephemeral: true });
        return;
      }

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          claimedById: interaction.user.id,
          status: TicketStatus.IN_PROGRESS,
        },
      });

      await interaction.reply({ content: `Ticket claimed by <@${interaction.user.id}>.` });
    } catch (error) {
      logger.error('Error claiming ticket:', error);
      await interaction.reply({ content: 'Failed to claim ticket.', ephemeral: true }).catch(() => null);
    }
  }
};

const closeHandler: ButtonHandler = {
  customId: 'ticket_close',
  async execute(interaction: ButtonInteraction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
        const ticket = await prisma.ticket.findFirst({
          where: { channelId: interaction.channelId, status: { not: TicketStatus.CLOSED } },
        });
        if (ticket?.openedById !== interaction.user.id) {
          await interaction.reply({ content: 'You do not have permission to close this ticket.', ephemeral: true });
          return;
        }
      }

      await interaction.reply({ content: 'Closing ticket in 5 seconds...' });
      await ticketService.closeTicket(interaction.channel as TextChannel, interaction.user, 'Closed via button');
    } catch (error) {
      logger.error('Error closing ticket from button:', error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Failed to close ticket.', ephemeral: true }).catch(() => null);
      }
    }
  }
};

const transcriptHandler: ButtonHandler = {
  customId: 'ticket_transcript',
  async execute(interaction: ButtonInteraction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
        await interaction.reply({ content: 'You do not have permission to generate transcripts.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const ticket = await prisma.ticket.findFirst({
        where: { channelId: interaction.channelId },
      });

      if (!ticket) {
        await interaction.editReply({ content: 'This is not a ticket channel.' });
        return;
      }

      const html = await ticketService.generateTranscript(ticket.id);
      const attachment = new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `transcript-${ticket.number}.html` });

      await interaction.editReply({ content: 'Transcript generated:', files: [attachment] });
    } catch (error) {
      logger.error('Error generating transcript from button:', error);
      await interaction.editReply({ content: 'Failed to generate transcript.' }).catch(() => null);
    }
  }
};

export default [claimHandler, closeHandler, transcriptHandler];
