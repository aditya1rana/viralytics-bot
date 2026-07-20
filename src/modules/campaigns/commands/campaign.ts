import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { CampaignService } from '../services/campaignService.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import logger from '../../../services/logger.js';
import { auditLogger } from '../../../services/auditLogger.js';
import { Platform, CampaignStatus, AuditAction } from '@prisma/client';
import COLORS from '../../../utils/colors.js';

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
                    await interaction.reply({ content: `A campaign with the name **${name}** already exists.`, ephemeral: true });
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

                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'edit') {
                const id = interaction.options.getString('campaign', true);
                const field = interaction.options.getString('field', true);
                const value = interaction.options.getString('value', true);

                const campaign = await CampaignService.getCampaignById(id);
                if (!campaign || campaign.guildId !== guildId) {
                    await interaction.reply({ content: 'Campaign not found.', ephemeral: true });
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
                        await interaction.reply({ content: `Invalid status. Valid options: ${validStatuses.join(', ')}`, ephemeral: true });
                        return;
                    }
                    updateData.status = value.toUpperCase() as CampaignStatus;
                } else if (field === 'payPerApproved') {
                    const pay = parseFloat(value);
                    if (isNaN(pay)) {
                        await interaction.reply({ content: 'Invalid number for pay per approved.', ephemeral: true });
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
                
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'archive') {
                const id = interaction.options.getString('campaign', true);
                const campaign = await CampaignService.getCampaignById(id);
                if (!campaign || campaign.guildId !== guildId) {
                    await interaction.reply({ content: 'Campaign not found.', ephemeral: true });
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
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'close') {
                const id = interaction.options.getString('campaign', true);
                const campaign = await CampaignService.getCampaignById(id);
                if (!campaign || campaign.guildId !== guildId) {
                    await interaction.reply({ content: 'Campaign not found.', ephemeral: true });
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
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'list') {
                const campaigns = await CampaignService.listCampaigns(guildId);
                
                if (campaigns.length === 0) {
                    await interaction.reply({ content: 'No campaigns found in this server.', ephemeral: true });
                    return;
                }

                const embed = embedBuilder.create({
                    title: 'Campaigns',
                    description: campaigns.map(c => `**${c.name}** - \`${c.status}\``).join('\n')
                });
                
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'info') {
                const id = interaction.options.getString('campaign', true);
                const campaign = await CampaignService.getCampaignById(id);
                
                if (!campaign || campaign.guildId !== guildId) {
                    await interaction.reply({ content: 'Campaign not found.', ephemeral: true });
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
                
                await interaction.reply({ embeds: [embed] });
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
