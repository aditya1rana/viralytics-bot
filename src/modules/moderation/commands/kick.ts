import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { isModOrAdmin } from '../../../services/permissions.js';
import { moderationService } from '../services/moderationService.js';
import { auditLogger } from '../../../services/auditLogger.js';
import logger from '../../../services/logger.js';
import { AuditAction, ModAction } from '@prisma/client';

const kickCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    try {
      const user = interaction.options.getUser('user', true);
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
      
      if (!member.kickable) {
        await interaction.reply({ embeds: [embedBuilder.error('I cannot kick this user.')], ephemeral: true });
        return;
      }

      try {
        await user.send({
          embeds: [embedBuilder.error(`You have been kicked from **${interaction.guild.name}**\n**Reason:** ${reason}`)]
        });
      } catch (e) {
        // Ignored
      }

      await member.kick(reason);

      const modCase = await moderationService.createModCase({
        guildId: interaction.guild.id,
        userId: user.id,
        moderatorId: interaction.user.id,
        action: ModAction.KICK,
        reason
      });

      await interaction.reply({
        embeds: [
          embedBuilder.success(`Successfully kicked ${user.tag} (Case #${modCase.caseNumber})`)
        ]
      });

      await auditLogger({
        guildId: interaction.guild.id,
        action: AuditAction.MOD_KICK,
        actorId: interaction.user.id,
        targetId: user.id,
        reason,
        metadata: { caseNumber: modCase.caseNumber }
      });
    } catch (error) {
      logger.error('Error in kick command', error);
      if (!interaction.replied) {
        await interaction.reply({ embeds: [embedBuilder.error('An error occurred while executing the command.')], ephemeral: true });
      }
    }
  }
};

export default kickCommand;
