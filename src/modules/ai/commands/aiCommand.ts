import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { Command } from '../../../types/index.js';
import { prisma } from '../../../services/database.js';
import { aiService } from '../services/aiService.js';
import { hasStaffPermission } from '../utils/permissions.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Manage AI support in tickets')
    .addSubcommand(subcommand =>
      subcommand.setName('on').setDescription('Enable AI responses in this ticket')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('off').setDescription('Disable AI responses in this ticket')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('status').setDescription('Check AI status in this ticket')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('takeover').setDescription('Take over this ticket and disable AI')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const isStaff = await hasStaffPermission(interaction.member as any, interaction.guild);
    if (!isStaff) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    const channel = interaction.channel as TextChannel;
    const ticket = await prisma.ticket.findFirst({ where: { channelId: channel.id } });

    if (!ticket) {
      await interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'on') {
      await aiService.setAiStatus(ticket.id, 'AI_ACTIVE', interaction.user);
      await interaction.reply({ content: `🤖 **AI Support Enabled**\n\nAI support has been re-enabled by <@${interaction.user.id}>.` });
    } else if (subcommand === 'off') {
      await aiService.setAiStatus(ticket.id, 'AI_DISABLED', interaction.user);
      await interaction.reply({ content: `🔇 **AI Support Disabled**\n\nAI responses have been manually disabled by <@${interaction.user.id}>.` });
    } else if (subcommand === 'takeover') {
      await aiService.setAiStatus(ticket.id, 'HUMAN_CONTROLLED', interaction.user);
      await interaction.reply({ content: `🧑‍💼 **Human Support Active**\n\nTaken over by <@${interaction.user.id}>` });
    } else if (subcommand === 'status') {
      let statusEmoji = '🤖';
      if (ticket.aiStatus === 'AI_DISABLED') statusEmoji = '🔇';
      if (ticket.aiStatus === 'WAITING_FOR_MODERATOR' || ticket.aiStatus === 'HUMAN_CONTROLLED') statusEmoji = '🧑‍💼';
      
      await interaction.reply({ 
        content: `${statusEmoji} **AI Status:** ${ticket.aiStatus}\n**Ticket Type:** ${ticket.category}`, 
        ephemeral: true 
      });
    }
  }
};

export default command;
