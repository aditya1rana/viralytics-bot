import { ModalSubmitInteraction } from 'discord.js';
import { ModalHandler } from '../../../types/index.js';
import { verificationService } from '../services/verificationService.js';
import prisma from '../../../services/database.js';
import logger from '../../../services/logger.js';
import { buildEmbed } from '../../../services/embedBuilder.js';
import COLORS from '../../../utils/colors.js';

const captchaModalHandler: ModalHandler = {
  customId: /^captcha_modal:answer:\d+$/,
  async execute(interaction: ModalSubmitInteraction) {
    // Defer reply immediately to prevent Discord's 3-second timeout during verification processing
    await interaction.deferReply({ ephemeral: true });

    try {
      const customId = interaction.customId; // format: captcha_modal:answer:12
      const parts = customId.split(':');
      const expectedAnswer = parts[2];
      const userAnswer = interaction.fields.getTextInputValue('captcha_input').trim();

      if (userAnswer !== expectedAnswer) {
        await interaction.editReply({ content: '❌ Incorrect answer. Please click the Verify button to try again.' });
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
        await interaction.editReply({ embeds: [embed] });
      } else {
        const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
        if (config?.verifiedRoleId) {
          const role = guild.roles.cache.get(config.verifiedRoleId);
          if (role) {
            try {
              await member.roles.add(role);
              const embed = buildEmbed({
                title: '✅ Verification Successful',
                description: 'You solved the captcha and have been verified!',
                color: COLORS.SUCCESS
              });
              await interaction.editReply({ embeds: [embed] });
              return;
            } catch (e) {
              await interaction.editReply({ 
                content: '❌ Solved captcha, but failed to assign the role. Please make sure the bot\'s role (`Viralytics Bot`) is positioned **ABOVE** your verified role in your Server Settings -> Roles list.' 
              });
              return;
            }
          }
        }
        await interaction.editReply({ content: 'An error occurred while verifying you. Please contact staff.' });
      }

    } catch (error) {
      logger.error('Error handling captcha modal:', error);
      await interaction.editReply({ content: 'Something went wrong processing your captcha.' }).catch(() => null);
    }
  }
};

export default captchaModalHandler;
