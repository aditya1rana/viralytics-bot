import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import { Command } from '../../../types/index.js';
import logger from '../../../services/logger.js';
import { buildEmbed } from '../../../services/embedBuilder.js';
import COLORS from '../../../utils/colors.js';
import { createAnnouncement, sendAnnouncement, listAnnouncements } from '../services/announcementService.js';
import { paginate } from '../../../services/pagination.js';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Manage announcements')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new announcement')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send the announcement to')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('The title of the announcement')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The announcement message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (Hex code)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('image-url')
                        .setDescription('URL of an image to attach')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('mention-role')
                        .setDescription('Role to mention')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('schedule')
                        .setDescription('ISO date to schedule (e.g., 2026-07-21T10:00:00Z)')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List scheduled and sent announcements')
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return;

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'create') {
                const channel = interaction.options.getChannel('channel', true);
                const title = interaction.options.getString('title', true);
                const message = interaction.options.getString('message', true);
                const color = interaction.options.getString('color');
                const imageUrl = interaction.options.getString('image-url');
                const mentionRole = interaction.options.getRole('mention-role');
                const schedule = interaction.options.getString('schedule');

                let scheduledAt: Date | null = null;
                if (schedule) {
                    scheduledAt = new Date(schedule);
                    if (isNaN(scheduledAt.getTime())) {
                        await interaction.reply({
                            embeds: [buildEmbed({ title: 'Error', description: 'Invalid schedule date format. Please use ISO 8601.', color: COLORS.ERROR })],
                            ephemeral: true
                        });
                        return;
                    }
                }

                const data = {
                    guildId: interaction.guildId,
                    channelId: channel.id,
                    title,
                    message,
                    color: color || undefined,
                    imageUrl: imageUrl || undefined,
                    mentionRoleId: mentionRole?.id,
                    scheduledAt,
                    isPublished: false,
                    createdBy: interaction.user.id
                };

                const announcement = await createAnnouncement(data);

                if (scheduledAt) {
                    await interaction.reply({
                        embeds: [buildEmbed({ title: 'Success', description: `Announcement scheduled for <t:${Math.floor(scheduledAt.getTime() / 1000)}:f>.`, color: COLORS.SUCCESS })],
                        ephemeral: true
                    });
                } else {
                    await interaction.deferReply({ ephemeral: true });
                    const sent = await sendAnnouncement(interaction.client, announcement);
                    if (sent) {
                        await interaction.editReply({
                            embeds: [buildEmbed({ title: 'Success', description: 'Announcement sent successfully.', color: COLORS.SUCCESS })]
                        });
                    } else {
                        await interaction.editReply({
                            embeds: [buildEmbed({ title: 'Error', description: 'Failed to send announcement.', color: COLORS.ERROR })]
                        });
                    }
                }
            } else if (subcommand === 'list') {
                await interaction.deferReply({ ephemeral: true });
                const { announcements, total } = await listAnnouncements(interaction.guildId);

                if (announcements.length === 0) {
                    await interaction.editReply({
                        embeds: [buildEmbed({ title: 'Announcements', description: 'No announcements found.', color: COLORS.PRIMARY })]
                    });
                    return;
                }

                const pages = announcements.map((ann: any, i: number) => {
                    const status = ann.isPublished ? 'Published' : (ann.scheduledAt ? `Scheduled: <t:${Math.floor(new Date(ann.scheduledAt).getTime() / 1000)}:f>` : 'Draft');
                    return buildEmbed({
                        title: `Announcement: ${ann.title}`,
                        description: `**Status:** ${status}\n**Channel:** <#${ann.channelId}>\n\n${ann.content.substring(0, 500)}${ann.content.length > 500 ? '...' : ''}`,
                        color: COLORS.PRIMARY
                    }).setFooter({ text: `Announcement ${i + 1} of ${total} | ID: ${ann.id}` });
                });

                if (pages.length > 0) {
                    await paginate(interaction, pages);
                }
            }
        } catch (error) {
            logger.error('Error in announce command:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    embeds: [buildEmbed({ title: 'Error', description: 'An error occurred while processing the command.', color: COLORS.ERROR })]
                });
            } else {
                await interaction.reply({
                    embeds: [buildEmbed({ title: 'Error', description: 'An error occurred while processing the command.', color: COLORS.ERROR })],
                    ephemeral: true
                });
            }
        }
    }
};

export default command;
