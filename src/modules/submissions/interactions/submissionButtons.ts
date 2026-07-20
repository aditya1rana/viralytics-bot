import { ButtonHandler } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { submissionService } from '../services/submissionService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { xpService } from '../../xp/services/xpService.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

const submissionButtons: ButtonHandler[] = [
  {
    customId: /^submission_approve:/,
    async execute(interaction) {
      try {
        if (!interaction.guild) return;
        
        const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
          await interaction.reply({ content: 'You do not have permission to do this.', ephemeral: true });
          return;
        }

        const id = interaction.customId.split(':')[1];
        await interaction.deferUpdate();

        const submission = await submissionService.approveSubmission(id, interaction.user.id);
        
        if (submission) {
          await xpService.addXp(interaction.guild.id, submission.userId, 50, 'Submission Approved');
        }

        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = embedBuilder.create({
          title: originalEmbed.title || 'Campaign Submission',
          description: originalEmbed.description?.replace(/Status: \*\*[A-Z]+\*\*/i, 'Status: **APPROVED**') || '',
          color: '#00FF00'
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`dummy_approved`)
            .setLabel('Approved')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        );

        await interaction.message.edit({ embeds: [updatedEmbed], components: [row] });

      } catch (error) {
        logger.error('Error approving submission:', error);
      }
    }
  },
  {
    customId: /^submission_reject:/,
    async execute(interaction) {
      try {
        if (!interaction.guild) return;
        
        const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
          await interaction.reply({ content: 'You do not have permission to do this.', ephemeral: true });
          return;
        }

        const id = interaction.customId.split(':')[1];
        await interaction.deferUpdate();

        const submission = await submissionService.rejectSubmission(id, interaction.user.id);

        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = embedBuilder.create({
          title: originalEmbed.title || 'Campaign Submission',
          description: originalEmbed.description?.replace(/Status: \*\*[A-Z]+\*\*/i, 'Status: **REJECTED**') || '',
          color: '#FF0000'
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`dummy_rejected`)
            .setLabel('Rejected')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );

        await interaction.message.edit({ embeds: [updatedEmbed], components: [row] });

      } catch (error) {
        logger.error('Error rejecting submission:', error);
      }
    }
  },
  {
    customId: /^submission_delete:/,
    async execute(interaction) {
      try {
        if (!interaction.guild) return;
        
        const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
          await interaction.reply({ content: 'You do not have permission to do this.', ephemeral: true });
          return;
        }

        const id = interaction.customId.split(':')[1];
        await interaction.deferUpdate();

        await submissionService.deleteSubmission(id);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`dummy_deleted`)
            .setLabel('Deleted')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await interaction.message.edit({ components: [row] });
      } catch (error) {
        logger.error('Error deleting submission:', error);
      }
    }
  }
];

export default submissionButtons;
