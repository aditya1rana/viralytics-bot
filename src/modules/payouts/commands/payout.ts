import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import { Command } from '../../../types/index.js';
import { prisma } from '../../../services/database.js';
import { embedBuilder } from '../../../services/embedBuilder.js';
import { logger } from '../../../services/logger.js';
import { payoutService } from '../services/payoutService.js';
import COLORS from '../../../utils/colors.js';
import { PayoutStatus } from '@prisma/client';

export default {
    data: new SlashCommandBuilder()
        .setName('payout')
        .setDescription('Manage campaign payouts')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View payout status for a user')
                .addUserOption(opt => opt.setName('user').setDescription('The user to view payouts for').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('approve')
                .setDescription('Approve pending payouts for a user')
                .addUserOption(opt => opt.setName('user').setDescription('The user whose payouts to approve').setRequired(true))
                .addStringOption(opt => opt.setName('campaign').setDescription('Specific campaign to approve').setAutocomplete(true).setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('export')
                .setDescription('Export payouts to CSV')
                .addStringOption(opt => opt.setName('campaign').setDescription('Filter by campaign').setAutocomplete(true).setRequired(false))
                .addStringOption(opt => opt.setName('status').setDescription('Filter by status').addChoices(
                    { name: 'Pending', value: 'PENDING' },
                    { name: 'Completed', value: 'COMPLETED' }
                ).setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('calculate')
                .setDescription('Calculate payouts for a campaign')
                .addStringOption(opt => opt.setName('campaign').setDescription('The campaign to calculate payouts for').setAutocomplete(true).setRequired(true))
        ),

    async autocomplete(interaction: AutocompleteInteraction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const campaigns = await prisma.campaign.findMany({
                where: {
                    guildId: interaction.guildId!,
                    name: {
                        contains: focusedValue,
                        mode: 'insensitive'
                    }
                },
                take: 25
            });

            await interaction.respond(
                campaigns.map(c => ({ name: c.name, value: c.id }))
            );
        } catch (error) {
            logger.error(`Autocomplete error in payout command: ${error}`);
        }
    },

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;

        try {
            await interaction.deferReply({ ephemeral: true });

            if (subcommand === 'view') {
                const user = interaction.options.getUser('user', true);
                const summary = await payoutService.getPayoutSummary(guildId, user.id);
                
                const embed = embedBuilder.create({
                    title: `Payout Summary for ${user.username}`,
                    description: `**Total Earned:** $${summary.total}\n**Pending:** $${summary.pending}\n**Completed:** $${summary.completed}`,
                    color: COLORS.PRIMARY
                });

                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'approve') {
                const user = interaction.options.getUser('user', true);
                const campaignId = interaction.options.getString('campaign');
                
                let payouts = await payoutService.getPendingPayouts(guildId);
                payouts = payouts.filter(p => p.userId === user.id);
                if (campaignId) payouts = payouts.filter(p => p.campaignId === campaignId);

                if (payouts.length === 0) {
                    await interaction.editReply({ content: 'No pending payouts found for this criteria.' });
                    return;
                }

                let totalApproved = 0;
                for (const payout of payouts) {
                    await payoutService.approvePayout(payout.id, interaction.user.id);
                    totalApproved += Number(payout.amount);
                }

                const embed = embedBuilder.success(
                    'Payouts Approved',
                    `Approved **${payouts.length}** payout(s) for ${user.username} totaling **$${totalApproved}**.`
                );
                await interaction.editReply({ embeds: [embed] });
            }
            else if (subcommand === 'export') {
                const campaignId = interaction.options.getString('campaign') || undefined;
                const statusOption = interaction.options.getString('status') || 'ALL';
                
                const status = statusOption !== 'ALL' ? (statusOption as PayoutStatus) : undefined;
                
                const csvData = await payoutService.exportPayouts(guildId, { campaignId, status });
                
                if (!csvData) {
                    await interaction.editReply({ content: 'No payouts found for the given criteria.' });
                    return;
                }

                const attachment = new AttachmentBuilder(Buffer.from(csvData), { name: 'payouts.csv' });
                await interaction.editReply({ content: 'Here is the export of payouts:', files: [attachment] });
            }
            else if (subcommand === 'calculate') {
                const campaignId = interaction.options.getString('campaign', true);
                
                const createdCount = await payoutService.calculatePayouts(campaignId);
                
                const embed = embedBuilder.success(
                    'Payouts Calculated',
                    `Successfully calculated and created **${createdCount}** new payout records for the campaign.`
                );
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            logger.error(`Error in payout command: ${error}`);
            await interaction.editReply({ content: 'An error occurred while processing the command.', embeds: [] });
        }
    }
} as Command;
