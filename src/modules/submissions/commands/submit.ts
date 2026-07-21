import { ActionRowBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { ensureGuild, ensureMember, ensureUser } from '../../../utils/helpers.js';
import { logger } from '../../../services/logger.js';

const submitCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit a video link for a campaign')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
      }

      await ensureUser(interaction.member as any);
      await ensureGuild(interaction.guild);
      await ensureMember(interaction.guild.id, interaction.user.id);

      const modal = new ModalBuilder()
        .setCustomId('submit_link_modal')
        .setTitle('Submit Video Link');

      const campaignInput = new TextInputBuilder()
        .setCustomId('campaign_name')
        .setLabel('Campaign Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter the exact campaign name')
        .setRequired(true);

      const videoLinkInput = new TextInputBuilder()
        .setCustomId('video_link')
        .setLabel('Video Link')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://tiktok.com/... or https://youtube.com/shorts/...')
        .setRequired(true);

      const notesInput = new TextInputBuilder()
        .setCustomId('notes')
        .setLabel('Additional Notes')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Optional notes about your submission')
        .setRequired(false);

      const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(campaignInput);
      const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(videoLinkInput);
      const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput);

      modal.addComponents(row1, row2, row3);

      await interaction.showModal(modal);
    } catch (error) {
      logger.error('Error in /submit command:', error);
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({ content: 'An error occurred while opening the submit form.', ephemeral: true });
      }
    }
  }
};

export default submitCommand;
