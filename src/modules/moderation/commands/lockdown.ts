import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command } from '../../../types/index.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { isModOrAdmin } from '../../../services/permissions.js';
import { auditLogger } from '../../../services/auditLogger.js';
import COLORS from '../../../utils/colors.js';
import logger from '../../../services/logger.js';
import { AuditAction } from '@prisma/client';

const lockdownCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock down a channel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to lockdown (defaults to current)')
        .setRequired(false))
    .addNumberOption(option =>
        option.setName('duration')
            .setDescription('Duration in minutes (optional)')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    try {
      const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
      const duration = interaction.options.getNumber('duration');
      
      if (!await isModOrAdmin(interaction.member as any)) {
        await interaction.reply({
          embeds: [embedBuilder.error('You do not have permission to use this command.')],
          ephemeral: true
        });
        return;
      }

      const everyoneRole = interaction.guild.roles.everyone;

      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false
      });

      await interaction.reply({
        embeds: [
          embedBuilder.create({
            description: `**${channel.name}** has been locked down.`,
            color: COLORS.ERROR
          })
        ]
      });

      await auditLogger({
        guildId: interaction.guild.id,
        action: AuditAction.MOD_MUTE,
        actorId: interaction.user.id,
        targetId: channel.id,
        reason: `Lockdown channel: ${channel.name}`,
        metadata: { duration }
      });

      if (duration) {
          setTimeout(async () => {
              try {
                  await channel.permissionOverwrites.edit(everyoneRole, {
                      SendMessages: null
                  });
                  await channel.send({
                      embeds: [embedBuilder.success(`**${channel.name}** has been unlocked.`)]
                  });
              } catch (e) {
                  logger.error('Failed to auto-unlock channel', e);
              }
          }, duration * 60 * 1000);
      }
    } catch (error) {
      logger.error('Error in lockdown command', error);
      if (!interaction.replied) {
        await interaction.reply({ embeds: [embedBuilder.error('An error occurred while executing the command.')], ephemeral: true });
      }
    }
  }
};

export default lockdownCommand;
