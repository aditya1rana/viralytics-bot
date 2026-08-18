import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../../types/index.js';
import { CampaignService } from '../services/campaignService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import logger from '../../../services/logger.js';
import { auditLogger } from '../../../services/auditLogger.js';
import { Platform, CampaignStatus, AuditAction } from '@prisma/client';
import COLORS from '../../../utils/colors.js';
import { prisma } from '../../../services/database.js';

const parsePlatforms = (input: string): Platform[] => {
    const validPlatforms = Object.values(Platform);
    return input
        .split(',')
        .map(p => p.trim().toUpperCase() as Platform)
        .filter(p => validPlatforms.includes(p));
};

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('campaign')
        .setDescription('Manage campaigns')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName('create')
            .setDescription('Create a new campaign')
            .addStringOption(opt => opt.setName('name').setDescription('Campaign name').setRequired(true))
            .addStringOption(opt => opt.setName('description').setDescription('Campaign description').setRequired(false))
            .addStringOption(opt => opt.setName('platforms').setDescription('Comma-separated platforms (e.g. TIKTOK, YOUTUBE)').setRequired(false))
            .addNumberOption(opt => opt.setName('pay-per-approved').setDescription('Amount paid per approved video').setRequired(false))
            .addStringOption(opt => opt.setName('starts-at').setDescription('Start ISO Date').setRequired(false))
            .addStringOption(opt => opt.setName('ends-at').setDescription('End ISO Date').setRequired(false))
            .addIntegerOption(opt => opt.setName('max-user-submissions').setDescription('Max submissions per user').setRequired(false))
            .addIntegerOption(opt => opt.setName('max-total-submissions').setDescription('Max total submissions').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('edit')
            .setDescription('Edit an existing campaign')
            .addStringOption(opt => opt.setName('campaign').setDescription('Select campaign').setRequired(true).setAutocomplete(true))
            .addStringOption(opt => opt.setName('field').setDescription('Field to edit').setRequired(true).addChoices(
                { name: 'Name', value: 'name' },
                { name: 'Description', value: 'description' },
                { name: 'Status', value: 'status' },
                { name: 'Pay Per Approved', value: 'payPerApproved' }
            ))
            .addStringOption(opt => opt.setName('value').setDescription('New value').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('announce')
            .setDescription('Setup Discord roles/channels and announce the campaign')
            .addStringOption(opt => opt.setName('campaign').setDescription('Select campaign').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(sub => sub
            .setName('archive')
            .setDescription('Archive a campaign')
            .addStringOption(opt => opt.setName('campaign').setDescription('Select campaign').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(sub => sub
            .setName('close')
            .setDescription('Close a campaign')
            .addStringOption(opt => opt.setName('campaign').setDescription('Select campaign').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List all campaigns')
        )
        .addSubcommand(sub => sub
            .setName('info')
            .setDescription('Show campaign details')
            .addStringOption(opt => opt.setName('campaign').setDescription('Select campaign').setRequired(true).setAutocomplete(true))
        ),

    async autocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.guildId) return;
        const focusedValue = interaction.options.getFocused();
        const campaigns = await CampaignService.searchCampaigns(interaction.guildId, focusedValue);
        await interaction.respond(
            campaigns.map((c: any) => ({ name: `${c.name} (${c.status})`, value: c.id }))
        );
    },

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        try {
            if (subcommand === 'create') {
                await interaction.deferReply();
                const name = interaction.options.getString('name', true);
                const description = interaction.options.getString('description') || undefined;
                const platformsStr = interaction.options.getString('platforms');
                const payPerApproved = interaction.options.getNumber('pay-per-approved') || undefined;
                const startsAtStr = interaction.options.getString('starts-at');
                const endsAtStr = interaction.options.getString('ends-at');
                const maxSubmissionsPerUser = interaction.options.getInteger('max-user-submissions') || undefined;
                const maxTotalSubmissions = interaction.options.getInteger('max-total-submissions') || undefined;

                const startsAt = startsAtStr ? new Date(startsAtStr) : undefined;
                const endsAt = endsAtStr ? new Date(endsAtStr) : undefined;

                const exists = await CampaignService.getCampaignByName(guildId, name);
                if (exists) {
                    await interaction.editReply({ content: `A campaign with the name **${name}** already exists.` });
                    return;
                }

                let platforms: Platform[] = [];
                if (platformsStr) {
                    platforms = parsePlatforms(platformsStr);
                }

                const campaign = await CampaignService.createCampaign(guildId, {
                    name,
                    description,
                    platforms,
                    payPerApproved,
                    startsAt,
                    endsAt,
                    maxSubmissionsPerUser,
                    maxTotalSubmissions,
                    createdBy: interaction.user.id
                });

                await auditLogger({
                    guildId,
                    action: AuditAction.CAMPAIGN_CREATED,
                    actorId: interaction.user.id,
                    targetId: campaign.id,
                    reason: `Created campaign: ${name}`
                });

                const embed = embedBuilder.success(`Campaign **${name}** created successfully!`)
                    .addFields([
                        { name: 'Status', value: campaign.status, inline: true },
                        { name: 'Platforms', value: platforms.length > 0 ? platforms.join(', ') : 'Any', inline: true }
                    ]);

                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'edit') {
                await interaction.deferReply();
                const id = interaction.options.getString('campaign', true);
                const field = interaction.options.getString('field', true);
                const value = interaction.options.getString('value', true);

                const campaign = await CampaignService.getCampaignById(id);
                if (!campaign || campaign.guildId !== guildId) {
                    await interaction.editReply({ content: 'Campaign not found.' });
                    return;
                }

                let updateData: any = {};
                if (field === 'name') {
                    updateData.name = value;
                } else if (field === 'description') {
                    updateData.description = value;
                } else if (field === 'status') {
                    const validStatuses = Object.values(CampaignStatus);
                    if (!validStatuses.includes(value.toUpperCase() as CampaignStatus)) {
                        await interaction.editReply({ content: `Invalid status. Valid options: ${validStatuses.join(', ')}` });
                        return;
                    }
                    updateData.status = value.toUpperCase() as CampaignStatus;
                } else if (field === 'payPerApproved') {
                    const pay = parseFloat(value);
                    if (isNaN(pay)) {
                        await interaction.editReply({ content: 'Invalid number for pay per approved.' });
                        return;
                    }
                    updateData.payPerApproved = pay;
                }

                await CampaignService.editCampaign(id, updateData);

                await auditLogger({
                    guildId,
                    action: AuditAction.CAMPAIGN_EDITED,
                    actorId: interaction.user.id,
                    targetId: id,
                    reason: `Edited campaign ${campaign.name}: ${field} -> ${value}`
                });

                const embed = embedBuilder.success(`Campaign **${campaign.name}** updated successfully!`)
                    .setDescription(`Changed **${field}** to \`${value}\``);
                
                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'archive') {
                await interaction.deferReply();
                const id = interaction.options.getString('campaign', true);
                const campaign = await CampaignService.getCampaignById(id);
                if (!campaign || campaign.guildId !== guildId) {
                    await interaction.editReply({ content: 'Campaign not found.' });
                    return;
                }

                await CampaignService.archiveCampaign(id);

                await auditLogger({
                    guildId,
                    action: AuditAction.CAMPAIGN_ARCHIVED,
                    actorId: interaction.user.id,
                    targetId: id,
                    reason: `Archived campaign ${campaign.name}`
                });

                const embed = embedBuilder.success(`Campaign **${campaign.name}** archived.`);
                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'close') {
                await interaction.deferReply();
                const id = interaction.options.getString('campaign', true);
                const campaign = await CampaignService.getCampaignById(id);
                if (!campaign || campaign.guildId !== guildId) {
                    await interaction.editReply({ content: 'Campaign not found.' });
                    return;
                }

                await CampaignService.closeCampaign(id);

                await auditLogger({
                    guildId,
                    action: AuditAction.CAMPAIGN_CLOSED,
                    actorId: interaction.user.id,
                    targetId: id,
                    reason: `Closed campaign ${campaign.name}`
                });

                const embed = embedBuilder.success(`Campaign **${campaign.name}** closed.`);
                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'list') {
                await interaction.deferReply();
                const campaigns = await CampaignService.listCampaigns(guildId);
                
                if (campaigns.length === 0) {
                    await interaction.editReply({ content: 'No campaigns found in this server.' });
                    return;
                }

                const embed = embedBuilder.create({
                    title: 'Campaigns',
                    description: campaigns.map(c => `**${c.name}** - \`${c.status}\``).join('\n')
                });
                
                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'info') {
                await interaction.deferReply();
                const id = interaction.options.getString('campaign', true);
                const campaign = await CampaignService.getCampaignById(id);
                
                if (!campaign || campaign.guildId !== guildId) {
                    await interaction.editReply({ content: 'Campaign not found.' });
                    return;
                }

                const stats = await CampaignService.getCampaignStats(id);

                const embed = new EmbedBuilder()
                    .setTitle(`Campaign: ${campaign.name}`)
                    .setColor(COLORS.PRIMARY)
                    .setDescription(campaign.description || 'No description provided.')
                    .addFields([
                        { name: 'Status', value: `\`${campaign.status}\``, inline: true },
                        { name: 'Pay/Approved', value: campaign.payPerApproved ? `$${campaign.payPerApproved}` : 'N/A', inline: true },
                        { name: 'Platforms', value: campaign.platforms.length > 0 ? campaign.platforms.join(', ') : 'Any', inline: true },
                        { name: 'Start Date', value: campaign.startsAt ? `<t:${Math.floor(campaign.startsAt.getTime()/1000)}:d>` : 'None', inline: true },
                        { name: 'End Date', value: campaign.endsAt ? `<t:${Math.floor(campaign.endsAt.getTime()/1000)}:d>` : 'None', inline: true },
                        { name: 'Max Submissions/User', value: campaign.maxSubmissionsPerUser?.toString() || 'Unlimited', inline: true },
                        { name: '\u200B', value: '**Statistics**' },
                        { name: 'Total Submissions', value: stats.totalSubmissions.toString(), inline: true },
                        { name: 'Approved', value: stats.approved.toString(), inline: true },
                        { name: 'Rejected', value: stats.rejected.toString(), inline: true },
                        { name: 'Pending', value: stats.pending.toString(), inline: true },
                        { name: 'Active Clippers', value: stats.activeClippers.toString(), inline: true }
                    ])
                    .setFooter({ text: `ID: ${campaign.id}` });
                
                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'announce') {
                await interaction.deferReply({ ephemeral: true });
                const id = interaction.options.getString('campaign', true);
                const campaign = await prisma.campaign.findUnique({ where: { id } });
                
                if (!campaign || campaign.guildId !== guildId) {
                    await interaction.editReply({ content: 'Campaign not found.' });
                    return;
                }

                const guild = interaction.guild!;
                
                // 1. Check or Create Role
                let role = campaign.roleId ? guild.roles.cache.get(campaign.roleId) : null;
                if (!role) {
                    role = await guild.roles.create({
                        name: campaign.name,
                        color: COLORS.PRIMARY,
                        reason: 'Auto-created for campaign'
                    });
                    await prisma.campaign.update({ where: { id: campaign.id }, data: { roleId: role.id } });
                }

                // 2. Check or Create Category
                let category: any = campaign.categoryId ? guild.channels.cache.get(campaign.categoryId) : null;
                if (!category) {
                    category = await guild.channels.create({
                        name: campaign.name,
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                            { id: role.id, allow: [PermissionFlagsBits.ViewChannel] }
                        ]
                    });
                    await prisma.campaign.update({ where: { id: campaign.id }, data: { categoryId: category.id } });
                }

                // 3. Check or Create Channels
                const existingChannels = guild.channels.cache.filter(c => c.parentId === category.id);
                
                const createIfMissing = async (name: string, type: any, isSubmit: boolean = false, isChat: boolean = false, isVoice: boolean = false) => {
                    const existing = existingChannels.find(c => c.name === name);
                    if (existing) return existing;

                    const roleOverwrite: any = { 
                        id: role!.id, 
                        allow: [PermissionFlagsBits.ViewChannel],
                        deny: []
                    };

                    if (!isChat && type !== ChannelType.GuildVoice) {
                        roleOverwrite.deny.push(PermissionFlagsBits.SendMessages);
                    }
                    if (type === ChannelType.GuildVoice) {
                        roleOverwrite.deny.push(PermissionFlagsBits.Connect);
                    }

                    const overwrites: any = [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        roleOverwrite
                    ];

                    const channel = await guild.channels.create({
                        name,
                        type,
                        parent: category.id,
                        permissionOverwrites: overwrites
                    });

                    if (isSubmit && channel.isTextBased()) {
                        await prisma.campaign.update({ where: { id: campaign.id }, data: { submitChannelId: channel.id } });
                        
                        const submitEmbed = new EmbedBuilder()
                            .setTitle('📥 Submit Your Clips')
                            .setDescription(`Click the button below to submit a video for **${campaign.name}**.`)
                            .setColor(COLORS.SUCCESS);
                        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder().setCustomId(`submit_specific_${campaign.id}`).setLabel('Submit Clip').setStyle(ButtonStyle.Success).setEmoji('📲')
                        );
                        await (channel as any).send({ embeds: [submitEmbed], components: [row] });
                    }
                    
                    if (isVoice) {
                        await prisma.campaign.update({ where: { id: campaign.id }, data: { budgetVoiceChannelId: channel.id } });
                    }
                    return channel;
                };

                await createIfMissing('campaign-details', ChannelType.GuildText);
                await createIfMissing('leaderboard', ChannelType.GuildText);
                await createIfMissing('updates', ChannelType.GuildText);
                await createIfMissing('clip-bank', ChannelType.GuildText);
                await createIfMissing('chat', ChannelType.GuildText, false, true);
                await createIfMissing('submit-clips', ChannelType.GuildText, true);
                await createIfMissing('Budget Used: 0%', ChannelType.GuildVoice, false, false, true);

                // 4. Post Announcement
                const announceEmbed = new EmbedBuilder()
                    .setTitle(`Earn Money by Posting Clips for ${campaign.name}`)
                    .setDescription(`All you gotta do is **register for the campaign with the button below & follow the campaign details** to start making money.\n\n**❗ Campaign Details**\n• **Platforms**: ${campaign.platforms.length > 0 ? campaign.platforms.join(', ') : 'Any'}\n\n**💸 Payment Details**\n**Payout**: $${campaign.payPerApproved || 0} per approved clip\n\n➡️ **Join The Campaign**\nClick the button below to start clipping!`)
                    .setColor(COLORS.SUCCESS);

                const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(`join_campaign_${campaign.id}`).setLabel('Join Campaign').setStyle(ButtonStyle.Success).setEmoji('💸'),
                    new ButtonBuilder().setCustomId(`status_campaign_${campaign.id}`).setLabel('Campaign Status').setStyle(ButtonStyle.Primary).setEmoji('📉'),
                    new ButtonBuilder().setCustomId(`leave_campaign_${campaign.id}`).setLabel('Leave Campaign').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
                );

                if (interaction.channel?.isTextBased()) {
                    await (interaction.channel as any).send({ embeds: [announceEmbed], components: [buttons] });
                }
                
                await interaction.editReply({ content: '✅ Campaign setup and announced successfully!' });
            }
        } catch (error: any) {
            logger.error(`Campaign Command Error: ${error.message}`, error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: `An error occurred: ${error.message}`, ephemeral: true });
            } else {
                await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true });
            }
        }
    }
};

export default command;
