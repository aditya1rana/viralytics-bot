import { Client } from 'discord.js';
import { prisma } from './database.js';
import logger from './logger.js';

export function startSchedulers(client: Client) {
  // Update campaign voice channel stats every 15 minutes
  setInterval(async () => {
    try {
      const activeCampaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          budgetVoiceChannelId: { not: null }
        }
      });

      for (const campaign of activeCampaigns) {
        if (!campaign.budgetVoiceChannelId) continue;

        try {
          const guild = client.guilds.cache.get(campaign.guildId);
          if (!guild) continue;

          const channel = guild.channels.cache.get(campaign.budgetVoiceChannelId);
          if (!channel || !channel.isVoiceBased()) continue;

          // Calculate total payouts for this campaign
          const payouts = await prisma.payout.aggregate({
            where: { campaignId: campaign.id, status: { in: ['COMPLETED', 'PROCESSING'] } },
            _sum: { amount: true }
          });

          const totalSpent = payouts._sum.amount ? payouts._sum.amount.toNumber() : 0;
          const totalBudget = campaign.contractValue ? campaign.contractValue.toNumber() : 0;

          let percentage = 0;
          if (totalBudget > 0) {
            percentage = Math.min(100, Math.round((totalSpent / totalBudget) * 100));
          } else {
             // If no budget is set, calculate based on views goal and cpm if we really wanted to, 
             // but if contractValue is 0, percentage is 0.
             // Wait, the bot has payPerApproved and maxTotalSubmissions maybe. 
             // Just show $ amount if no budget set.
          }

          let newName = `🔊 Budget Used: ${percentage}%`;
          if (totalBudget === 0) {
             newName = `🔊 Spent: $${totalSpent}`;
          }

          if (channel.name !== newName) {
            await channel.setName(newName, 'Automated budget update');
          }

        } catch (err) {
          logger.error(`Failed to update voice channel for campaign ${campaign.id}:`, err);
        }
      }
    } catch (error) {
      logger.error('Error in budget voice channel updater:', error);
    }
  }, 15 * 60 * 1000); // 15 minutes
}
