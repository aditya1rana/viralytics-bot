import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { ensureGuild, ensureMember, ensureUser } from '../../../utils/helpers.js';
import { logger } from '../../../services/logger.js';
import { submissionService } from '../services/submissionService.js';
import { paginate } from '../../../services/pagination.js';
import { embedBuilder } from '../../../services/embedBuilder.js';

const mySubmissionsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('my-submissions')
    .setDescription('View your submitted links'),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      await ensureUser(interaction.member as any);
      await ensureGuild(interaction.guild);
      await ensureMember(interaction.guild.id, interaction.user.id);

      const submissions = await submissionService.getUserSubmissions(interaction.guild.id, interaction.user.id, 1, 100);

      if (submissions.total === 0) {
        const embed = embedBuilder.info('No Submissions', 'You have not submitted any links yet.');
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const embeds = [];
      const pageSize = 10;
      const pages = Math.ceil(submissions.items.length / pageSize);

      for (let i = 0; i < pages; i++) {
        const pageItems = submissions.items.slice(i * pageSize, (i + 1) * pageSize);
        
        const description = pageItems.map(sub => 
          `**ID:** \`${sub.shortId}\` | **Campaign:** ${sub.campaign.name}\n` +
          `**Platform:** ${sub.platform} | **Status:** ${sub.status}\n` +
          `**Date:** <t:${Math.floor(sub.createdAt.getTime() / 1000)}:R>`
        ).join('\n\n');

        embeds.push(embedBuilder.create({
          title: 'Your Submissions',
          description
        }));
      }

      await paginate(interaction, embeds);

    } catch (error) {
      logger.error('Error in /my-submissions command:', error);
      await interaction.editReply({ content: 'An error occurred while fetching your submissions.' });
    }
  }
};

export default mySubmissionsCommand;
