import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { submissionService } from '../services/submissionService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';

const deleteSubmissionCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('delete-submission')
    .setDescription('Delete a submission')
    .addStringOption(option => 
      option.setName('id')
        .setDescription('The short ID of the submission to delete')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
      }

      const id = interaction.options.getString('id', true);
      
      await interaction.deferReply({ ephemeral: true });

      const submission = await submissionService.getSubmissionById(id);
      if (!submission) {
        await interaction.editReply({ content: 'Submission not found.' });
        return;
      }

      // Check permission: either submitter or admin
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (submission.userId !== interaction.user.id && !isAdmin) {
        await interaction.editReply({ content: 'You do not have permission to delete this submission.' });
        return;
      }

      await submissionService.deleteSubmission(submission.id);

      const embed = embedBuilder.success('Submission Deleted', `Submission \`${submission.shortId}\` has been deleted.`);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error in /delete-submission command:', error);
      await interaction.editReply({ content: 'An error occurred while deleting the submission.' });
    }
  }
};

export default deleteSubmissionCommand;
