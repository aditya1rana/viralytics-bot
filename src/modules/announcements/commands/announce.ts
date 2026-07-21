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
                        .setDescription('Schedule (e.g. 25-07-2026 2:30 PM, or just 2:30 PM for today)')
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

                // Defer reply immediately to prevent 3-second Discord timeout
                await interaction.deferReply({ ephemeral: true });

                let scheduledAt: Date | null = null;
                if (schedule) {
                    scheduledAt = parseISTDate(schedule);
                    if (!scheduledAt) {
                        await interaction.editReply({
                            embeds: [buildEmbed({ 
                                title: 'Error', 
                                description: 'Invalid schedule date format. Please use `DD-MM-YYYY hh:mm AM/PM` (e.g. `25-07-2026 2:30 PM`) or just `hh:mm AM/PM` (e.g. `2:30 PM` for today).', 
                                color: COLORS.ERROR 
                            })]
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
                    await interaction.editReply({
                        embeds: [buildEmbed({ title: 'Success', description: `Announcement scheduled for <t:${Math.floor(scheduledAt.getTime() / 1000)}:f>.`, color: COLORS.SUCCESS })]
                    });
                } else {
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

function parseISTDate(input: string): Date | null {
    const cleaned = input.trim();
    
    const dateTimeRegex = /^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i;
    const timeOnlyRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i;

    let year: number;
    let month: number;
    let day: number;
    let hour: number;
    let minute: number;
    let isPM = false;

    const matchDateTime = cleaned.match(dateTimeRegex);
    if (matchDateTime) {
        const part1 = parseInt(matchDateTime[1], 10);
        const part2 = parseInt(matchDateTime[2], 10);
        const part3 = parseInt(matchDateTime[3], 10);
        hour = parseInt(matchDateTime[4], 10);
        minute = parseInt(matchDateTime[5], 10);
        isPM = matchDateTime[6].toLowerCase() === 'pm';

        if (part1 > 31) {
            year = part1;
            month = part2;
            day = part3;
        } else {
            day = part1;
            month = part2;
            year = part3;
        }
    } else {
        const matchTime = cleaned.match(timeOnlyRegex);
        if (matchTime) {
            const today = new Date();
            const utcTime = today.getTime() + (today.getTimezoneOffset() * 60000);
            const istToday = new Date(utcTime + (3600000 * 5.5));

            year = istToday.getFullYear();
            month = istToday.getMonth() + 1;
            day = istToday.getDate();
            hour = parseInt(matchTime[1], 10);
            minute = parseInt(matchTime[2], 10);
            isPM = matchTime[3].toLowerCase() === 'pm';
        } else {
            const parsed = new Date(cleaned);
            if (isNaN(parsed.getTime())) return null;
            return parsed;
        }
    }

    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const padYear = (y: number) => y.toString().padStart(4, '0');

    const isoStr = `${padYear(year)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+05:30`;
    const result = new Date(isoStr);
    return isNaN(result.getTime()) ? null : result;
}

export default command;
