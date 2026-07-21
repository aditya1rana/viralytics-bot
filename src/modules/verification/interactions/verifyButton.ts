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

      const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
      const isVerified = await verificationService.isVerified(guild.id, interaction.user.id);

      if (isVerified) {
        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        
        // If they are verified in database but do not have the Discord role, try to assign it
        if (member && config?.verifiedRoleId && !member.roles.cache.has(config.verifiedRoleId)) {
          await interaction.deferReply({ ephemeral: true });
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
        
        await interaction.reply({ content: 'You are already verified!', ephemeral: true });
        return;
      }

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
        // Defer reply immediately to avoid 3-second Discord timeout during DB updates and Discord role additions
        await interaction.deferReply({ ephemeral: true });

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
