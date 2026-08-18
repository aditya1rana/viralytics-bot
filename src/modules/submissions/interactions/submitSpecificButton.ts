import { 
  ButtonInteraction, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { prisma } from '../../../services/database.js';

const submitSpecificButtonHandler: ButtonHandler = {
  customId: /^submit_specific_(.+)$/,
  async execute(interaction: ButtonInteraction) {
    try {
      const match = interaction.customId.match(/^submit_specific_(.+)$/);
      if (!match) return;
      const campaignId = match[1];

      // Verify campaign is active
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      });

      if (!campaign || campaign.status !== 'ACTIVE') {
        await interaction.reply({ content: '❌ This campaign is no longer active.', ephemeral: true });
        return;
      }

      const modalTitle = `Submit Video: ${campaign.name}`.slice(0, 45);

      const modal = new ModalBuilder()
        .setCustomId(`submit_video_modal:${campaign.id}`)
        .setTitle(modalTitle);

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
      logger.error('Error handling submit_specific_:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ An error occurred while opening the submission form.', ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ content: '❌ An error occurred while opening the submission form.', ephemeral: true }).catch(() => null);
      }
    }
  }
};

export default submitSpecificButtonHandler;
