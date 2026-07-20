import { Guild, User, TextChannel, PermissionFlagsBits, ChannelType, AttachmentBuilder } from 'discord.js';
import prisma from '../../../services/database.js';
import logger from '../../../services/logger.js';
import { TicketCategory, TicketStatus } from '@prisma/client';
import embedBuilder from '../../../services/embedBuilder.js';
import { findLogChannel } from '../../../utils/helpers.js';
import COLORS from '../../../utils/colors.js';

export const ticketService = {
  async getNextTicketNumber(guildId: string): Promise<number> {
    const lastTicket = await prisma.ticket.findFirst({
      where: { guildId },
      orderBy: { number: 'desc' },
    });
    return (lastTicket?.number || 0) + 1;
  },

  async createTicket(guild: Guild, user: User, category: TicketCategory, subject: string = 'General Support'): Promise<TextChannel | null> {
    const ticketNumber = await this.getNextTicketNumber(guild.id);
    const channelName = `ticket-${ticketNumber}-${user.username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;

    const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
    const categoryId = config?.ticketCategoryId || null;

    try {
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId,
        topic: `Ticket #${ticketNumber} | Subject: ${subject} | User: ${user.tag} (${user.id})`,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          },
          {
            id: guild.client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.AttachFiles,
            ],
          },
        ],
      });

      await prisma.ticket.create({
        data: {
          guildId: guild.id,
          openedById: user.id,
          channelId: channel.id,
          category,
          status: TicketStatus.OPEN,
          number: ticketNumber,
          subject,
        },
      });

      return channel;
    } catch (error) {
      logger.error(`Error creating ticket for user ${user.id} in guild ${guild.id}:`, error);
      return null;
    }
  },

  async generateTranscript(ticketId: string): Promise<string> {
    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    });

    let html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket Transcript</title>
        <style>
          body { font-family: sans-serif; background-color: #36393f; color: #dcddde; padding: 20px; }
          .message { margin-bottom: 20px; display: flex; flex-direction: column; }
          .header { display: flex; align-items: baseline; margin-bottom: 5px; }
          .author { font-weight: bold; color: #fff; margin-right: 10px; }
          .timestamp { font-size: 0.8em; color: #72767d; }
          .content { line-height: 1.4; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>Ticket Transcript</h1>
        <hr>
    `;

    for (const msg of messages) {
      const date = new Date(msg.createdAt).toLocaleString();
      html += `
        <div class="message">
          <div class="header">
            <span class="author">${msg.author?.username || 'Unknown'}</span>
            <span class="timestamp">${date}</span>
          </div>
          <div class="content">${msg.content}</div>
        </div>
      `;
    }

    html += `</body></html>`;
    return html;
  },

  async closeTicket(channel: TextChannel, closedBy: User, reason: string = 'No reason provided'): Promise<void> {
    const ticket = await prisma.ticket.findFirst({
      where: { channelId: channel.id, status: { not: TicketStatus.CLOSED } },
    });

    if (!ticket) return;

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CLOSED,
        closedBy: closedBy.id,
      },
    });

    const transcriptHtml = await this.generateTranscript(ticket.id);
    const attachment = new AttachmentBuilder(Buffer.from(transcriptHtml, 'utf-8'), { name: `transcript-${ticket.number}.html` });

    const logChannel = findLogChannel(channel.guild, null, 'ticket-logs');
    if (logChannel) {
      const embed = embedBuilder.info(
        'Ticket Closed',
        `**Ticket:** #${ticket.number}\n**Closed by:** <@${closedBy.id}>\n**Reason:** ${reason}\n**User:** <@${ticket.openedById}>`,
      );
      await logChannel.send({ embeds: [embed], files: [attachment] });
    }

    const member = await channel.guild.members.fetch(ticket.openedById).catch(() => null);
    if (member) {
      const dmEmbed = embedBuilder.info(
        'Ticket Closed',
        `Your ticket in **${channel.guild.name}** has been closed.\n**Reason:** ${reason}`,
      );
      await member.send({ embeds: [dmEmbed] }).catch(() => null);
    }

    setTimeout(async () => {
      try {
        await channel.delete('Ticket closed');
      } catch (err) {
        logger.error(`Failed to delete ticket channel ${channel.id}`, err);
      }
    }, 5000);
  },

  async getTicketStats(guildId: string) {
    const stats = await prisma.ticket.groupBy({
      by: ['status', 'category'],
      where: { guildId },
      _count: {
        id: true,
      },
    });
    return stats;
  }
};
