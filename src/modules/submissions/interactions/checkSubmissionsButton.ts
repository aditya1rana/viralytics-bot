import { ButtonInteraction } from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { submissionService } from '../services/submissionService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { paginate } from '../../../services/pagination.js';

const checkSubmissionsButtonHandler: ButtonHandler = {
  customId: /^check_submissions_(.+)$/,
  async execute(interaction: ButtonInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This can only be used in a server.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const match = interaction.customId.match(/^check_submissions_(.+)$/);
      if (!match) {
        await interaction.editReply({ content: 'Invalid button.' });
        return;
      }
      
      const campaignId = match[1];

      const submissions = await submissionService.getUserSubmissions(interaction.guild.id, interaction.user.id, 1, 100);

      // Filter by campaign
      const campaignSubmissions = submissions.items.filter(s => s.campaignId === campaignId);

      if (campaignSubmissions.length === 0) {
        const embed = embedBuilder.info('No Submissions', 'You have not submitted any links for this campaign yet.');
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const embeds = [];
      const pageSize = 10;
      const pages = Math.ceil(campaignSubmissions.length / pageSize);

      for (let i = 0; i < pages; i++) {
        const pageItems = campaignSubmissions.slice(i * pageSize, (i + 1) * pageSize);
        
        const description = pageItems.map(sub => 
          `**URL:** [Link](${sub.originalUrl})\n` +
          `**Platform:** ${sub.platform} | **Status:** ${sub.status}\n` +
          `**Date:** <t:${Math.floor(sub.createdAt.getTime() / 1000)}:R>`
        ).join('\n\n');

        embeds.push(embedBuilder.create({
          title: 'Your Submissions for this Campaign',
          description
        }));
      }

      await paginate(interaction, embeds);

    } catch (error) {
      logger.error('Error handling check_submissions_ button:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'An error occurred while fetching your submissions.', ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ content: 'An error occurred while fetching your submissions.', ephemeral: true }).catch(() => null);
      }
    }
  }
};

export default checkSubmissionsButtonHandler;
