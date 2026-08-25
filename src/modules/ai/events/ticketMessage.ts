import { Events, Message } from 'discord.js';
import { prisma } from '../../../services/database.js';
import { aiService } from '../services/aiService.js';
import logger from '../../../services/logger.js';
import { BotEvent } from '../../../types/index.js';

const handler: BotEvent = {
  name: Events.MessageCreate,
  async execute(...args: any[]) {
    const message = args[0] as Message;
    if (message.author.bot || !message.guild) return;

    try {
      // Check if message is in a ticket channel
      const ticket = await prisma.ticket.findFirst({
        where: { 
          channelId: message.channel.id,
          status: 'OPEN'
        }
      });

      if (!ticket) return;

      // Handle AI message
      await aiService.handleTicketMessage(message, ticket);
      
    } catch (error) {
      logger.error('Error in AI ticketMessage event:', error);
    }
  }
};

export default handler;
