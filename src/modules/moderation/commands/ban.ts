import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { isModOrAdmin } from '../../../services/permissions.js';
import { moderationService } from '../services/moderationService.js';
import { auditLogger } from '../../../services/auditLogger.js';
import logger from '../../../services/logger.js';
import { AuditAction, ModAction } from '@prisma/client';

const banCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    .addNumberOption(option =>
        option.setName('duration')
            .setDescription('Duration in days (optional)')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    try {
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const duration = interaction.options.getNumber('duration');
      
      if (!await isModOrAdmin(interaction.member as any)) {
        await interaction.reply({
          embeds: [embedBuilder.error('You do not have permission to use this command.')],
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (member && !member.bannable) {
        await interaction.reply({ embeds: [embedBuilder.error('I cannot ban this user.')], ephemeral: true });
        return;
      }

      let expiresAt: Date | undefined;
      if (duration) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + duration);
      }

      try {
        await user.send({
          embeds: [embedBuilder.error(`You have been banned from **${interaction.guild.name}**\n**Reason:** ${reason}${duration ? `\n**Duration:** ${duration} days` : ''}`)]
        });
      } catch (e) {
        // Ignored
      }

      await interaction.guild.members.ban(user.id, { reason });

      const modCase = await moderationService.createModCase({
        guildId: interaction.guild.id,
        userId: user.id,
        moderatorId: interaction.user.id,
        action: ModAction.BAN,
        reason,
        expiresAt
      });

      await interaction.reply({
        embeds: [
          embedBuilder.success(`Successfully banned ${user.tag} (Case #${modCase.caseNumber})`)
        ]
      });

      await auditLogger({
        guildId: interaction.guild.id,
        action: AuditAction.MOD_BAN,
        actorId: interaction.user.id,
        targetId: user.id,
        reason,
        metadata: { caseNumber: modCase.caseNumber, duration }
      });
    } catch (error) {
      logger.error('Error in ban command', error);
      if (!interaction.replied) {
        await interaction.reply({ embeds: [embedBuilder.error('An error occurred while executing the command.')], ephemeral: true });
      }
    }
  }
};

export default banCommand;
