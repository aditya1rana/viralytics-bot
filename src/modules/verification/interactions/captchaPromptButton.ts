import { ButtonInteraction, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import logger from '../../../services/logger.js';

const captchaPromptButtonHandler: ButtonHandler = {
  customId: 'verify_captcha_prompt',
  async execute(interaction: ButtonInteraction) {
    try {
      // Immediately show modal (no DB queries, zero delay!)
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      const answer = num1 + num2;

      const modal = new ModalBuilder()
        .setCustomId(`captcha_modal:answer:${answer}`)
        .setTitle('Security Check');

      const input = new TextInputBuilder()
        .setCustomId('captcha_input')
        .setLabel(`What is ${num1} + ${num2}?`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(3);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
      modal.addComponents(row);

      await interaction.showModal(modal);

    } catch (error) {
      logger.error('Error handling captcha prompt button:', error);
      if (!interaction.replied && !interaction.deferred) {
         await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => null);
      }
    }
  }
};

export default captchaPromptButtonHandler;
