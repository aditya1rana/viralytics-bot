import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../../types/index.js';
import { reminderService } from '../services/reminderService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { logger } from '../../../services/logger.js';
import { ensureGuild } from '../../../utils/helpers.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Manage reminders')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a reminder')
        .addStringOption(opt => 
          opt.setName('type')
             .setDescription('Reminder type')
             .setRequired(true)
             .addChoices(
               { name: 'Campaign Deadline', value: 'campaign_deadline' },
               { name: 'Missing Submission', value: 'missing_submission' },
               { name: 'Inactive', value: 'inactive' },
               { name: 'Payout', value: 'payout' }
             )
        )
        .addStringOption(opt => 
          opt.setName('message')
             .setDescription('Reminder message')
             .setRequired(true)
        )
        .addStringOption(opt => 
          opt.setName('schedule-at')
             .setDescription('ISO datetime (e.g., 2026-07-25T10:00:00Z)')
             .setRequired(true)
        )
        .addChannelOption(opt => 
          opt.setName('channel')
             .setDescription('Channel to send reminder')
             .setRequired(false)
        )
        .addRoleOption(opt => 
          opt.setName('role')
             .setDescription('Role to mention')
             .setRequired(false)
        )
        .addUserOption(opt => 
          opt.setName('user')
             .setDescription('User to mention or DM')
             .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List upcoming reminders')
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a reminder')
        .addStringOption(opt => 
          opt.setName('id')
             .setDescription('Reminder ID')
             .setRequired(true)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      await ensureGuild(interaction.guild);
      const subCommand = interaction.options.getSubcommand();

      if (subCommand === 'create') {
        const type = interaction.options.getString('type', true);
        const message = interaction.options.getString('message', true);
        const scheduleAtStr = interaction.options.getString('schedule-at', true);
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const user = interaction.options.getUser('user');

        const scheduledAt = new Date(scheduleAtStr);
        if (isNaN(scheduledAt.getTime())) {
          await interaction.reply({ content: 'Invalid date format. Please use ISO 8601 format (e.g., 2026-07-25T10:00:00Z).', ephemeral: true });
          return;
        }
        if (scheduledAt <= new Date()) {
          await interaction.reply({ content: 'Schedule date must be in the future.', ephemeral: true });
          return;
        }

        const reminder = await reminderService.createReminder({
          guildId: interaction.guild.id,
          type,
          message,
          channelId: channel?.id,
          roleId: role?.id,
          userId: user?.id,
          scheduledAt
        });

        const embed = embedBuilder.create({
          title: 'Reminder Created',
          description: `Reminder scheduled for <t:${Math.floor(scheduledAt.getTime() / 1000)}:f>`,
          fields: [
            { name: 'ID', value: reminder.id, inline: true },
            { name: 'Type', value: type, inline: true }
          ]
        });

        await interaction.reply({ embeds: [embed] });
      } else if (subCommand === 'list') {
        const reminders = await reminderService.listReminders(interaction.guild.id);
        
        if (reminders.length === 0) {
          await interaction.reply({ embeds: [embedBuilder.info('Upcoming Reminders', 'No upcoming reminders.')] });
          return;
        }

        const description = reminders.map(r => 
          `**ID:** ${r.id} | <t:${Math.floor(r.scheduledAt.getTime() / 1000)}:R>\nType: ${r.type}\nMessage: ${r.message}`
        ).join('\n\n');

        const embed = embedBuilder.create({
          title: 'Upcoming Reminders',
          description: description.substring(0, 4096)
        });

        await interaction.reply({ embeds: [embed] });
      } else if (subCommand === 'delete') {
        const id = interaction.options.getString('id', true);
        
        try {
          await reminderService.deleteReminder(id);
          await interaction.reply({ embeds: [embedBuilder.success('Reminder Deleted', `Successfully deleted reminder \`${id}\`.`)] });
        } catch (err) {
          await interaction.reply({ content: 'Failed to delete reminder. Make sure the ID is correct.', ephemeral: true });
        }
      }
    } catch (error) {
      logger.error('Error in reminder command:', error);
      await interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
    }
  }
};

export default command;
