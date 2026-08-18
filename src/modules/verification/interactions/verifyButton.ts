import { ButtonInteraction, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder } from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import { verificationService } from '../services/verificationService.js';
import prisma from '../../../services/database.js';
import logger from '../../../services/logger.js';
import { buildEmbed } from '../../../services/embedBuilder.js';
import COLORS from '../../../utils/colors.js';
import { getGuildConfig } from '../../../services/configManager.js';

const verifyButtonHandler: ButtonHandler = {
  customId: 'verify_start',
  async execute(interaction: ButtonInteraction) {
    try {
      const guild = interaction.guild;
      if (!guild) {
        await interaction.reply({ content: 'This must be used in a server.', ephemeral: true });
        return;
      }

      // We MUST defer reply immediately to prevent the 3-second timeout, 
      // especially when the database is cold or waking up.
      await interaction.deferReply({ ephemeral: true });

      const [config, isVerified] = await Promise.all([
        getGuildConfig(guild.id),
        verificationService.isVerified(guild.id, interaction.user.id)
      ]);

      if (isVerified) {
        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        
        // If they are verified in database but do not have the Discord role, try to assign it
        if (member && config?.verifiedRoleId && !member.roles.cache.has(config.verifiedRoleId)) {
          const role = guild.roles.cache.get(config.verifiedRoleId);
          
          if (role) {
            try {
              await member.roles.add(role);
              await interaction.editReply({ content: `✅ Assigned you ${role.name} role!` });
              await verificationService.logVerification(guild, member);
              return;
            } catch (err) {
              logger.error('Failed to re-add verified role:', err);
              await interaction.editReply({ 
                content: '❌ Failed to assign the role. Please make sure the bot\'s role (`Viralytics Bot`) is positioned **ABOVE** your verified role in your Server Settings -> Roles list.' 
              });
              return;
            }
          }
        }
        
        await interaction.editReply({ content: 'You are already verified!' });
        return;
      }

      const captchaEnabled = config?.captchaEnabled ?? false;

      if (captchaEnabled) {
        // Since we deferred, we cannot show a modal directly.
        // We must send a button that they click to open the modal.
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('verify_captcha_prompt')
                .setLabel('Complete CAPTCHA')
                .setStyle(1) // Primary
        );
        await interaction.editReply({ 
            content: '🔒 **Security Check Required**\n\nPlease click the button below to complete a quick CAPTCHA and verify your account.', 
            components: [row] 
        });
      } else {
        // No captcha, verify directly

        const member = await guild.members.fetch(interaction.user.id);
        const success = await verificationService.verifyMember(guild, member);
        if (success) {
          const embed = buildEmbed({
            title: '✅ Verification Successful',
            description: 'You have been verified and granted access to the server.',
            color: COLORS.SUCCESS
          });
          await interaction.editReply({ embeds: [embed] });
        } else {
          // Check if it failed because of role assignment permission
          if (config?.verifiedRoleId) {
            const role = guild.roles.cache.get(config.verifiedRoleId);
            if (role) {
              try {
                await member.roles.add(role);
              } catch (e) {
                await interaction.editReply({ 
                  content: '❌ Verified in database, but failed to assign the role. Please make sure the bot\'s role (`Viralytics Bot`) is positioned **ABOVE** your verified role in your Server Settings -> Roles list.' 
                });
                return;
              }
            }
          }
          await interaction.editReply({ content: 'An error occurred during verification. Please contact a staff member.' });
        }
      }

    } catch (error) {
      logger.error('Error handling verify button:', error);
      // Fallback response depending on whether we deferred the reply already
      if (interaction.deferred) {
        await interaction.editReply({ content: 'Something went wrong.' }).catch(() => null);
      } else {
        await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => null);
      }
    }
  }
};

export default verifyButtonHandler;
