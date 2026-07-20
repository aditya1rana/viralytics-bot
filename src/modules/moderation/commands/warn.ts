import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { isModOrAdmin } from '../../../services/permissions.js';
import { moderationService } from '../services/moderationService.js';
import { auditLogger } from '../../../services/auditLogger.js';
import COLORS from '../../../utils/colors.js';
import logger from '../../../services/logger.js';
import { AuditAction, ModAction } from '@prisma/client';

const warnCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user in the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    try {
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);
      
      if (!await isModOrAdmin(interaction.member as any)) {
        await interaction.reply({
          embeds: [embedBuilder.error('You do not have permission to use this command.')],
          ephemeral: true
        });
        return;
      }

      if (user.id === interaction.user.id) {
        await interaction.reply({
          embeds: [embedBuilder.error('You cannot warn yourself.')],
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      const modCase = await moderationService.createModCase({
        guildId: interaction.guild.id,
        userId: user.id,
        moderatorId: interaction.user.id,
        action: ModAction.WARN,
        reason
      });

      try {
        await user.send({
          embeds: [
            embedBuilder.create({
              title: 'Warning Received',
              description: `You have been warned in **${interaction.guild.name}**\n**Reason:** ${reason}`,
              color: COLORS.WARNING
            })
          ]
        });
      } catch (e) {
        // Ignored
      }

      await interaction.reply({
        embeds: [
          embedBuilder.success(`Successfully warned ${user.tag} (Case #${modCase.caseNumber})`)
        ]
      });

      await auditLogger({
        guildId: interaction.guild.id,
        action: AuditAction.MOD_WARN,
        actorId: interaction.user.id,
        targetId: user.id,
        reason,
        metadata: { caseNumber: modCase.caseNumber }
      });

      const autoMod = await moderationService.checkAutoMod(interaction.guild.id, user.id);
      if (autoMod.action === 'mute') {
        if (member) {
          await member.timeout(24 * 60 * 60 * 1000, autoMod.reason);
          await (interaction.channel as any)?.send({ embeds: [embedBuilder.info(`${user.tag} has been auto-muted for exceeding the warning limit.`)] });
        }
      } else if (autoMod.action === 'ban') {
        if (member) {
          await member.ban({ reason: autoMod.reason });
          await (interaction.channel as any)?.send({ embeds: [embedBuilder.info(`${user.tag} has been auto-banned for exceeding the warning limit.`)] });
        }
      }
    } catch (e) {
      logger.error('Error in warn command', e);
      if (!interaction.replied) {
        await interaction.reply({ embeds: [embedBuilder.error('An error occurred while executing the command.')], ephemeral: true });
      }
    }
  }
};

export default warnCommand;
