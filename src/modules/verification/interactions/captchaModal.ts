import { ModalSubmitInteraction } from 'discord.js';
import { ModalHandler } from '../../../types/index.js';
import { verificationService } from '../services/verificationService.js';
import logger from '../../../services/logger.js';
import { buildEmbed } from '../../../services/embedBuilder.js';
import COLORS from '../../../utils/colors.js';

const captchaModalHandler: ModalHandler = {
  customId: /^captcha_modal:answer:\d+$/,
  async execute(interaction: ModalSubmitInteraction) {
    try {
      const customId = interaction.customId; // format: captcha_modal:answer:12
      const parts = customId.split(':');
      const expectedAnswer = parts[2];
      const userAnswer = interaction.fields.getTextInputValue('captcha_input').trim();

      if (userAnswer !== expectedAnswer) {
        await interaction.reply({ content: '❌ Incorrect answer. Please click the Verify button to try again.', ephemeral: true });
        return;
      }

      const guild = interaction.guild;
      if (!guild) return;

      const member = await guild.members.fetch(interaction.user.id);
      const success = await verificationService.verifyMember(guild, member);

      if (success) {
        const embed = buildEmbed({
          title: '✅ Verification Successful',
          description: 'You solved the captcha and have been verified!',
          color: COLORS.SUCCESS
        });
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ content: 'An error occurred while verifying you. Please contact staff.', ephemeral: true });
      }

    } catch (error) {
      logger.error('Error handling captcha modal:', error);
      await interaction.reply({ content: 'Something went wrong processing your captcha.', ephemeral: true }).catch(() => null);
    }
  }
};

export default captchaModalHandler;
