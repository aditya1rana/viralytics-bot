import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { submissionService } from '../services/submissionService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { prisma } from '../../../services/database.js';
import { paginate } from '../../../services/pagination.js';

const campaignLinksCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('campaign-links')
    .setDescription('View submissions for a specific campaign (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => 
      option.setName('campaign')
        .setDescription('The exact campaign name')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  
  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused();
      const campaigns = await prisma.campaign.findMany({
        where: {
          guildId: interaction.guildId!,
          name: {
            contains: focusedValue,
            mode: 'insensitive'
          }
        },
        take: 25
      });

      await interaction.respond(
        campaigns.map(choice => ({ name: choice.name, value: choice.name }))
      );
    } catch (error) {
      logger.error('Autocomplete error in campaign-links:', error);
    }
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
      }

      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isAdmin) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const campaignName = interaction.options.getString('campaign', true);
      
      const campaign = await prisma.campaign.findFirst({
        where: { guildId: interaction.guild.id, name: campaignName }
      });

      if (!campaign) {
        await interaction.editReply({ content: 'Campaign not found.' });
        return;
      }

      const submissions = await submissionService.getCampaignSubmissions(campaign.id, 1, 100);

      if (submissions.total === 0) {
        const embed = embedBuilder.info('No Submissions', `No submissions found for campaign **${campaign.name}**.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const embeds = [];
      const pageSize = 5; // Show 5 per page
      const pages = Math.ceil(submissions.items.length / pageSize);

      for (let i = 0; i < pages; i++) {
        const pageItems = submissions.items.slice(i * pageSize, (i + 1) * pageSize);
        
        const description = pageItems.map(sub => 
          `**ID:** \`${sub.shortId}\` | **User:** <@${sub.userId}>\n` +
          `**Platform:** ${sub.platform} | **Status:** ${sub.status}\n` +
          `**URL:** ${sub.originalUrl}\n` +
          `**Notes:** ${sub.notes || 'None'}\n` +
          `**Date:** <t:${Math.floor(sub.createdAt.getTime() / 1000)}:F>`
        ).join('\n\n');

        embeds.push(embedBuilder.create({
          title: `Submissions: ${campaign.name}`,
          description
        }));
      }

      await paginate(interaction, embeds);

    } catch (error) {
      logger.error('Error in /campaign-links command:', error);
      await interaction.editReply({ content: 'An error occurred while fetching campaign submissions.' });
    }
  }
};

export default campaignLinksCommand;
