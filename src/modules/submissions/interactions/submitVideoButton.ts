import { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';

const submitVideoButton: ButtonHandler = {
  customId: 'submit_video_start',
  async execute(interaction) {
    try {
      const modal = new ModalBuilder()
        .setCustomId('submit_video_modal')
        .setTitle('Submit your video(s)');

      const linksInput = new TextInputBuilder()
        .setCustomId('video_links')
        .setLabel('Video link(s) — one per line')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('https://...\nhttps://...\nhttps://...')
        .setRequired(true)
        .setMaxLength(4000);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(linksInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    } catch (error) {
      logger.error('Error showing submit video modal:', error);
    }
  }
};

export default submitVideoButton;
