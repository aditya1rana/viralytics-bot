import { ButtonInteraction, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import { verificationService } from '../services/verificationService.js';
import prisma from '../../../services/database.js';
import logger from '../../../services/logger.js';
import { buildEmbed } from '../../../services/embedBuilder.js';
import COLORS from '../../../utils/colors.js';

const verifyButtonHandler: ButtonHandler = {
  customId: 'verify_start',
  async execute(interaction: ButtonInteraction) {
    try {
      const guild = interaction.guild;
      if (!guild) {
        await interaction.reply({ content: 'This must be used in a server.', ephemeral: true });
        return;
      }

      const isVerified = await verificationService.isVerified(guild.id, interaction.user.id);
      if (isVerified) {
        await interaction.reply({ content: 'You are already verified!', ephemeral: true });
        return;
      }

      const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
      const captchaEnabled = config?.captchaEnabled ?? false;

      if (captchaEnabled) {
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
      } else {
        const member = await guild.members.fetch(interaction.user.id);
        const success = await verificationService.verifyMember(guild, member);
        if (success) {
          const embed = buildEmbed({
            title: '✅ Verification Successful',
            description: 'You have been verified and granted access to the server.',
            color: COLORS.SUCCESS
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          await interaction.reply({ content: 'An error occurred during verification. Please contact a staff member.', ephemeral: true });
        }
      }

    } catch (error) {
      logger.error('Error handling verify button:', error);
      await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => null);
    }
  }
};

export default verifyButtonHandler;
