import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, AutocompleteInteraction, ChannelType } from 'discord.js';
import { Command } from '../../../types/index.js';
import { configService } from '../services/configService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { logger } from '../../../services/logger.js';
import COLORS from '../../../utils/colors.js';

const configCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Manage guild configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('Show all current configuration')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-channel')
        .setDescription('Set a configuration channel')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('The channel type to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Welcome', value: 'welcomeChannelId' },
              { name: 'Verification', value: 'verificationChannelId' },
              { name: 'Submission', value: 'submissionChannelId' },
              { name: 'Leaderboard', value: 'leaderboardChannelId' },
              { name: 'Verification Log', value: 'verificationLogChannelId' },
              { name: 'Ticket Log', value: 'ticketLogChannelId' },
              { name: 'Submission Log', value: 'submissionLogChannelId' },
              { name: 'Duplicate Log', value: 'duplicateLogChannelId' },
              { name: 'Moderation Log', value: 'moderationLogChannelId' },
              { name: 'Campaign Log', value: 'campaignLogChannelId' },
              { name: 'Error Log', value: 'errorLogChannelId' },
              { name: 'Staff Action Log', value: 'staffActionLogChannelId' }
            )
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to set')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-role')
        .setDescription('Set a configuration role')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('The role type to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Verified', value: 'verifiedRoleId' },
              { name: 'Unverified', value: 'unverifiedRoleId' },
              { name: 'Muted', value: 'mutedRoleId' },
              { name: 'Moderator', value: 'modRoleId' },
              { name: 'Admin', value: 'adminRoleId' },
              { name: 'Clipper', value: 'clipperRoleId' }
            )
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to set')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-value')
        .setDescription('Set a configuration value')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('The configuration key')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option.setName('value')
            .setDescription('The value to set')
            .setRequired(true)
        )
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const keys = configService.getConfigKeys();
    const filtered = keys.filter(k => k.key.toLowerCase().includes(focusedValue)).slice(0, 25);
    
    await interaction.respond(
      filtered.map(k => ({ name: `${k.key} - ${k.description}`, value: k.key }))
    ).catch(e => logger.error(`Autocomplete error: ${e}`));
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const subcommand = interaction.options.getSubcommand();
    
    try {
      if (subcommand === 'view') {
        await interaction.deferReply({ ephemeral: true });
        const config = await configService.getFullConfig(interaction.guildId);
        
        const embed = embedBuilder.create({
          title: '⚙️ Guild Configuration',
          color: COLORS.PRIMARY,
          description: 'Current configuration settings for this server.',
          fields: [
            {
              name: 'Channels',
              value: [
                `**Welcome:** ${config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'Not Set'}`,
                `**Verification:** ${config.verificationChannelId ? `<#${config.verificationChannelId}>` : 'Not Set'}`,
                `**Submission:** ${config.submissionChannelId ? `<#${config.submissionChannelId}>` : 'Not Set'}`,
                `**Leaderboard:** ${config.leaderboardChannelId ? `<#${config.leaderboardChannelId}>` : 'Not Set'}`
              ].join('\n'),
              inline: true
            },
            {
              name: 'Roles',
              value: [
                `**Verified:** ${config.verifiedRoleId ? `<@&${config.verifiedRoleId}>` : 'Not Set'}`,
                `**Unverified:** ${config.unverifiedRoleId ? `<@&${config.unverifiedRoleId}>` : 'Not Set'}`,
                `**Muted:** ${config.mutedRoleId ? `<@&${config.mutedRoleId}>` : 'Not Set'}`,
                `**Moderator:** ${config.modRoleId ? `<@&${config.modRoleId}>` : 'Not Set'}`,
                `**Admin:** ${config.adminRoleId ? `<@&${config.adminRoleId}>` : 'Not Set'}`,
                `**Clipper:** ${config.clipperRoleId ? `<@&${config.clipperRoleId}>` : 'Not Set'}`
              ].join('\n'),
              inline: true
            },
            {
              name: 'Logs',
              value: [
                `**Verification Log:** ${config.verificationLogChannelId ? `<#${config.verificationLogChannelId}>` : 'Not Set'}`,
                `**Ticket Log:** ${config.ticketLogChannelId ? `<#${config.ticketLogChannelId}>` : 'Not Set'}`,
                `**Submission Log:** ${config.submissionLogChannelId ? `<#${config.submissionLogChannelId}>` : 'Not Set'}`,
                `**Duplicate Log:** ${config.duplicateLogChannelId ? `<#${config.duplicateLogChannelId}>` : 'Not Set'}`,
                `**Moderation Log:** ${config.moderationLogChannelId ? `<#${config.moderationLogChannelId}>` : 'Not Set'}`,
                `**Campaign Log:** ${config.campaignLogChannelId ? `<#${config.campaignLogChannelId}>` : 'Not Set'}`,
                `**Error Log:** ${config.errorLogChannelId ? `<#${config.errorLogChannelId}>` : 'Not Set'}`,
                `**Staff Action Log:** ${config.staffActionLogChannelId ? `<#${config.staffActionLogChannelId}>` : 'Not Set'}`
              ].join('\n'),
              inline: false
            }
          ]
        });

        await interaction.editReply({ embeds: [embed] });
      } else if (subcommand === 'set-channel') {
        const type = interaction.options.getString('type', true);
        const channel = interaction.options.getChannel('channel', true);
        
        await interaction.deferReply({ ephemeral: true });
        await configService.setChannel(interaction.guildId, type, channel.id);
        
        await interaction.editReply({ 
          content: `✅ Successfully updated channel setting \`${type}\` to <#${channel.id}>.`
        });
      } else if (subcommand === 'set-role') {
        const type = interaction.options.getString('type', true);
        const role = interaction.options.getRole('role', true);
        
        await interaction.deferReply({ ephemeral: true });
        await configService.setRole(interaction.guildId, type, role.id);
        
        await interaction.editReply({ 
          content: `✅ Successfully updated role setting \`${type}\` to <@&${role.id}>.`
        });
      } else if (subcommand === 'set-value') {
        const key = interaction.options.getString('key', true);
        const value = interaction.options.getString('value', true);
        
        await interaction.deferReply({ ephemeral: true });
        
        const validKeys = configService.getConfigKeys().map(k => k.key);
        if (!validKeys.includes(key)) {
          await interaction.editReply({ content: `❌ Invalid configuration key: \`${key}\`.` });
          return;
        }

        await configService.setValue(interaction.guildId, key, value);
        
        await interaction.editReply({ 
          content: `✅ Successfully updated configuration \`${key}\` to \`${value}\`.`
        });
      }
    } catch (error) {
      logger.error(`Error in config command: ${error}`);
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ An error occurred while executing the command.' });
      } else {
        await interaction.reply({ content: '❌ An error occurred while executing the command.', ephemeral: true });
      }
    }
  }
};

export default configCommand;
