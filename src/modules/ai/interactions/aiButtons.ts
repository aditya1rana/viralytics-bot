import { ButtonInteraction, TextChannel } from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import { prisma } from '../../../services/database.js';
import { aiService } from '../services/aiService.js';
import logger from '../../../services/logger.js';
import { hasStaffPermission } from '../utils/permissions.js';

const handler: ButtonHandler = {
  customId: /^ai_(.+)$/,
  async execute(interaction: ButtonInteraction) {
    const action = interaction.customId;
    const channel = interaction.channel as TextChannel;
    
    try {
      const ticket = await prisma.ticket.findFirst({ where: { channelId: channel.id } });
      if (!ticket) {
        await interaction.reply({ content: 'Could not find ticket record.', ephemeral: true });
        return;
      }

      if (action === 'ai_request_human') {
        if (ticket.aiStatus === 'WAITING_FOR_MODERATOR' || ticket.aiStatus === 'HUMAN_CONTROLLED' || ticket.aiStatus === 'AI_DISABLED') {
          await interaction.reply({ content: 'Human support has already been requested or AI is already disabled.', ephemeral: true });
          return;
        }

        await interaction.deferReply();
        await aiService.requestHuman(ticket.id, interaction.guild!, channel, interaction.user);
        await interaction.deleteReply();
        return;
      }

      // Staff controls
      const isStaff = await hasStaffPermission(interaction.member as any, interaction.guild!);
      if (!isStaff) {
        await interaction.reply({ content: 'You do not have permission to use AI controls.', ephemeral: true });
        return;
      }

      if (action === 'ai_on') {
        await aiService.setAiStatus(ticket.id, 'AI_ACTIVE', interaction.user);
        await channel.send({ content: `🤖 **AI Support Enabled**\n\nAI support has been re-enabled by <@${interaction.user.id}>.` });
        await interaction.reply({ content: 'AI Enabled.', ephemeral: true });
      } 
      else if (action === 'ai_off') {
        await aiService.setAiStatus(ticket.id, 'AI_DISABLED', interaction.user);
        await channel.send({ content: `🔇 **AI Support Disabled**\n\nAI responses have been manually disabled by <@${interaction.user.id}>.` });
        await interaction.reply({ content: 'AI Disabled.', ephemeral: true });
      }
      else if (action === 'ai_takeover') {
        await aiService.setAiStatus(ticket.id, 'HUMAN_CONTROLLED', interaction.user);
        await channel.send({ content: `🧑‍💼 **Human Support Active**\n\nTaken over by <@${interaction.user.id}>` });
        await interaction.reply({ content: 'You have taken over this ticket. AI disabled.', ephemeral: true });
      }
      else if (action === 'ai_status') {
        let statusEmoji = '🤖';
        if (ticket.aiStatus === 'AI_DISABLED') statusEmoji = '🔇';
        if (ticket.aiStatus === 'WAITING_FOR_MODERATOR' || ticket.aiStatus === 'HUMAN_CONTROLLED') statusEmoji = '🧑‍💼';
        
        await interaction.reply({ 
          content: `${statusEmoji} **AI Status:** ${ticket.aiStatus}\n**Ticket Type:** ${ticket.category}`, 
          ephemeral: true 
        });
      }

    } catch (error) {
      logger.error('Error handling AI button:', error);
      await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => null);
    }
  }
};

export default handler;
