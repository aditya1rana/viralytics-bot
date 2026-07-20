import { EmbedBuilder, TextChannel } from 'discord.js';
import { ModalHandler } from '../../../types/index.js';
import { prisma } from '../../../services/database.js';
import { submissionService } from '../services/submissionService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { logger } from '../../../services/logger.js';
import { findLogChannel } from '../../../utils/helpers.js';
import { xpService } from '../../xp/services/xpService.js';

const submitModalHandler: ModalHandler = {
  customId: 'submit_link_modal',
  async execute(interaction) {
    try {
      if (!interaction.guild) return;

      const campaignName = interaction.fields.getTextInputValue('campaign_name');
      const videoLink = interaction.fields.getTextInputValue('video_link');
      const notes = interaction.fields.getTextInputValue('notes') || undefined;

      await interaction.deferReply({ ephemeral: true });

      const campaign = await prisma.campaign.findFirst({
        where: {
          guildId: interaction.guild.id,
          name: { equals: campaignName, mode: 'insensitive' }
        }
      });

      if (!campaign) {
        await interaction.editReply({ content: `Campaign \`${campaignName}\` not found.` });
        return;
      }

      try {
        const submission = await submissionService.createSubmission({
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          campaignId: campaign.id,
          originalUrl: videoLink,
          notes,
        });

        // Award base XP
        await xpService.addXp(interaction.guild.id, interaction.user.id, 10, 'Link Submission');

        const successEmbed = embedBuilder.success(
          'Submission Received',
          `Your submission for **${campaign.name}** has been received.\n**ID:** \`${submission.shortId}\`\n**Platform:** ${submission.platform}`
        );
        
        await interaction.editReply({ embeds: [successEmbed] });

        // Log to submission-logs
        const logChannel = findLogChannel(interaction.guild, null, 'submission-logs');
        if (logChannel) {
          const logEmbed = embedBuilder.info(
            'New Submission',
            `**User:** <@${submission.userId}>\n**Campaign:** ${campaign.name}\n**ID:** \`${submission.shortId}\`\n**URL:** ${submission.originalUrl}\n**Notes:** ${notes || 'None'}`
          );
          await logChannel.send({ embeds: [logEmbed] });
        }

      } catch (error: any) {
        if (error.message.includes('Duplicate submission found')) {
          const duplicateEmbed = embedBuilder.error('Duplicate Submission', 'This URL has already been submitted for this campaign.');
          await interaction.editReply({ embeds: [duplicateEmbed] });
        } else {
          logger.error('Error creating submission:', error);
          await interaction.editReply({ content: 'Invalid URL or an error occurred while processing your submission.' });
        }
      }

    } catch (error) {
      logger.error('Modal execution error:', error);
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({ content: 'An error occurred.', ephemeral: true });
      } else {
        await interaction.editReply({ content: 'An error occurred.' });
      }
    }
  }
};

export default submitModalHandler;
