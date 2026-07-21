import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { submissionService } from '../services/submissionService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';

const searchLinkCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('search-link')
    .setDescription('Search for submitted links')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => 
      option.setName('url')
        .setDescription('Search by URL snippet')
        .setRequired(false)
    )
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Search by user')
        .setRequired(false)
    )
    .addStringOption(option => 
      option.setName('campaign')
        .setDescription('Search by campaign name')
        .setRequired(false)
    )
    .addStringOption(option => 
      option.setName('id')
        .setDescription('Search by short ID')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
      }

      const url = interaction.options.getString('url') || undefined;
      const user = interaction.options.getUser('user') || undefined;
      const campaign = interaction.options.getString('campaign') || undefined;
      const id = interaction.options.getString('id') || undefined;

      if (!url && !user && !campaign && !id) {
        await interaction.reply({ content: 'Please provide at least one search criterion.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const results = await submissionService.searchSubmissions(interaction.guild.id, {
        url,
        userId: user?.id,
        campaignName: campaign,
        shortId: id,
      });

      if (results.length === 0) {
        const embed = embedBuilder.info('Search Results', 'No submissions found matching your criteria.');
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const description = results.slice(0, 10).map(sub => 
        `**ID:** \`${sub.shortId}\` | **User:** <@${sub.userId}>\n` +
        `**Campaign:** ${sub.campaign.name} | **Status:** ${sub.status}\n` +
        `**URL:** ${sub.originalUrl}`
      ).join('\n\n');

      const embed = embedBuilder.create({
        title: `Search Results (${results.length} found)`,
        description,
        footer: results.length > 10 ? 'Showing top 10 results.' : undefined
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error in /search-link command:', error);
      await interaction.editReply({ content: 'An error occurred while searching.' });
    }
  }
};

export default searchLinkCommand;
