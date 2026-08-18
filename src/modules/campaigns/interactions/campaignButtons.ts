import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import { prisma } from '../../../services/database.js';
import { CampaignService } from '../services/campaignService.js';
import COLORS from '../../../utils/colors.js';

export const joinCampaignButton: ButtonHandler = {
  customId: /^join_campaign_(.+)$/,
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.guild) return;

      const match = interaction.customId.match(/^join_campaign_(.+)$/);
      if (!match) return;
      const campaignId = match[1];

      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) {
        await interaction.editReply({ content: 'Campaign no longer exists.' });
        return;
      }

      if (campaign.status !== 'ACTIVE') {
        await interaction.editReply({ content: 'This campaign is not active.' });
        return;
      }

      const roleId = campaign.roleId;
      if (!roleId) {
        await interaction.editReply({ content: 'Campaign role is not configured yet.' });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(roleId)) {
        await interaction.editReply({ content: 'You are already in this campaign!' });
        return;
      }

      await member.roles.add(roleId);

      const embed = new EmbedBuilder()
        .setTitle(`Let's Get Clipping, ${interaction.user.username} 💸`)
        .setDescription(`You've successfully joined the **${campaign.name}** campaign!\nGo to the <#${campaign.submitChannelId || 'submit-clips'}> channel to begin clipping and making money ⤵️`)
        .setColor(COLORS.SUCCESS)
        .setFooter({ text: 'Powered by Viralytics' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      if (interaction.deferred) await interaction.editReply({ content: 'An error occurred while joining.' });
    }
  }
};

export const leaveCampaignButton: ButtonHandler = {
  customId: /^leave_campaign_(.+)$/,
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.guild) return;

      const match = interaction.customId.match(/^leave_campaign_(.+)$/);
      if (!match) return;
      const campaignId = match[1];

      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) {
        await interaction.editReply({ content: 'Campaign no longer exists.' });
        return;
      }

      const roleId = campaign.roleId;
      if (!roleId) {
        await interaction.editReply({ content: 'Campaign role is not configured.' });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(roleId)) {
        await interaction.editReply({ content: 'You are not in this campaign.' });
        return;
      }

      await member.roles.remove(roleId);
      await interaction.editReply({ content: `You have successfully left the **${campaign.name}** campaign.` });
    } catch (error) {
      console.error(error);
      if (interaction.deferred) await interaction.editReply({ content: 'An error occurred while leaving.' });
    }
  }
};

export const statusCampaignButton: ButtonHandler = {
  customId: /^status_campaign_(.+)$/,
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.guild) return;

      const match = interaction.customId.match(/^status_campaign_(.+)$/);
      if (!match) return;
      const campaignId = match[1];

      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) {
        await interaction.editReply({ content: 'Campaign no longer exists.' });
        return;
      }

      // Fetch top 2 clippers
      const topClippers = await prisma.submission.groupBy({
        by: ['userId'],
        where: { campaignId, status: 'APPROVED' },
        _sum: { viewsCount: true },
        orderBy: { _sum: { viewsCount: 'desc' } },
        take: 2
      });

      let topText = 'No clippers yet.';
      if (topClippers.length > 0) {
        topText = '';
        for (let i = 0; i < topClippers.length; i++) {
          const u = topClippers[i];
          const user = await interaction.client.users.fetch(u.userId).catch(() => null);
          const medal = i === 0 ? '🥇' : '🥈';
          const views = (u._sum.viewsCount || 0).toLocaleString();
          topText += `${medal} **${user?.username || 'Unknown'}**: ${views} Views\n`;
        }
      }

      // Calculate totals
      const totals = await prisma.submission.aggregate({
        where: { campaignId, status: 'APPROVED' },
        _sum: { viewsCount: true }
      });
      const totalViews = totals._sum.viewsCount || 0;
      
      const viewsGoal = campaign.viewsGoal ? Number(campaign.viewsGoal).toLocaleString() : 'N/A';
      
      // Calculate total budget used
      let totalBudgetStr = '$0';
      let totalBudgetGoalStr = campaign.contractValue ? `$${campaign.contractValue.toNumber().toLocaleString()}` : 'N/A';
      
      const payoutTotals = await prisma.payout.aggregate({
        where: { campaignId, status: { in: ['COMPLETED', 'PROCESSING'] } },
        _sum: { amount: true }
      });
      if (payoutTotals._sum.amount) {
        totalBudgetStr = `$${payoutTotals._sum.amount.toNumber().toLocaleString()}`;
      }

      let endsInStr = 'N/A';
      if (campaign.endsAt) {
        const diffDays = Math.ceil((campaign.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        endsInStr = diffDays > 0 ? `in ${diffDays} days` : 'Ended';
      }

      const embed = new EmbedBuilder()
        .setTitle(`${campaign.name}`)
        .setDescription(`**Top Clippers this Campaign 📈**\n${topText}\n\n**Total Views**: ${totalViews.toLocaleString()} / ${viewsGoal}\n**Total Budget**: ${totalBudgetStr} / ${totalBudgetGoalStr}\n**Campaign Ends**: ${endsInStr}`)
        .setColor(COLORS.PRIMARY)
        .setFooter({ text: 'Last updated • Just now' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      if (interaction.deferred) await interaction.editReply({ content: 'An error occurred fetching status.' });
    }
  }
};

export default [joinCampaignButton, leaveCampaignButton, statusCampaignButton];
