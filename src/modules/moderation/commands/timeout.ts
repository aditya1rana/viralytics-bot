import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { isModOrAdmin } from '../../../services/permissions.js';
import { moderationService } from '../services/moderationService.js';
import { auditLogger } from '../../../services/auditLogger.js';
import logger from '../../../services/logger.js';
import { AuditAction, ModAction } from '@prisma/client';

const timeoutCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user in the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addNumberOption(option =>
        option.setName('duration')
            .setDescription('Duration in minutes')
            .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    try {
      const user = interaction.options.getUser('user', true);
      const duration = interaction.options.getNumber('duration', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      if (!await isModOrAdmin(interaction.member as any)) {
        await interaction.reply({
          embeds: [embedBuilder.error('You do not have permission to use this command.')],
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ embeds: [embedBuilder.error('User is not in the server.')], ephemeral: true });
        return;
      }
      
      if (!member.manageable) {
        await interaction.reply({ embeds: [embedBuilder.error('I cannot timeout this user.')], ephemeral: true });
        return;
      }

      const durationMs = duration * 60 * 1000;
      const expiresAt = new Date(Date.now() + durationMs);

      await member.timeout(durationMs, reason);

      const modCase = await moderationService.createModCase({
        guildId: interaction.guild.id,
        userId: user.id,
        moderatorId: interaction.user.id,
        action: ModAction.TIMEOUT,
        reason,
        expiresAt
      });

      await interaction.reply({
        embeds: [
          embedBuilder.success(`Successfully timed out ${user.tag} for ${duration} minutes (Case #${modCase.caseNumber})`)
        ]
      });

      await auditLogger({
        guildId: interaction.guild.id,
        action: AuditAction.MOD_TIMEOUT,
        actorId: interaction.user.id,
        targetId: user.id,
        reason,
        metadata: { caseNumber: modCase.caseNumber, duration }
      });
    } catch (error) {
      logger.error('Error in timeout command', error);
      if (!interaction.replied) {
        await interaction.reply({ embeds: [embedBuilder.error('An error occurred while executing the command.')], ephemeral: true });
      }
    }
  }
};

export default timeoutCommand;
