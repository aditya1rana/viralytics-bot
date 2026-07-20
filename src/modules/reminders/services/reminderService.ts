import { Client, TextChannel } from 'discord.js';
import { prisma } from '../../../services/database.js';
import { logger } from '../../../services/logger.js';
import { embedBuilder } from '../../../services/embedBuilder.js';

export const reminderService = {
  async createReminder(data: {
    guildId: string;
    type: string;
    message: string;
    channelId?: string;
    roleId?: string;
    userId?: string;
    scheduledAt: Date;
  }) {
    return prisma.reminder.create({
      data: {
        guildId: data.guildId,
        type: data.type,
        message: data.message,
        channelId: data.channelId,
        roleId: data.roleId,
        userId: data.userId,
        scheduledAt: data.scheduledAt,
        isSent: false
      }
    });
  },

  async listReminders(guildId: string) {
    return prisma.reminder.findMany({
      where: {
        guildId,
        isSent: false,
        scheduledAt: { gt: new Date() }
      },
      orderBy: { scheduledAt: 'asc' },
      take: 25
    });
  },

  async deleteReminder(id: string) {
    return prisma.reminder.delete({ where: { id } });
  },

  async getDueReminders() {
    return prisma.reminder.findMany({
      where: {
        isSent: false,
        scheduledAt: { lte: new Date() }
      }
    });
  },

  async sendReminder(reminder: any, client: Client) {
    try {
      let content = reminder.message;

      if (reminder.roleId) {
        content = `<@&${reminder.roleId}> ${content}`;
      }
      if (reminder.userId) {
        content = `<@${reminder.userId}> ${content}`;
      }

      if (reminder.channelId) {
        const channel = await client.channels.fetch(reminder.channelId) as TextChannel;
        if (channel && channel.isTextBased()) {
          const embed = embedBuilder.info('Reminder', content);
          await channel.send({ embeds: [embed] });
        }
      } else if (reminder.userId) {
        const user = await client.users.fetch(reminder.userId);
        if (user) {
          const embed = embedBuilder.info('Reminder', content);
          await user.send({ embeds: [embed] }).catch(() => null);
        }
      }

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { isSent: true }
      });
      
      logger.info(`Reminder ${reminder.id} sent successfully.`);
    } catch (error) {
      logger.error(`Error sending reminder ${reminder.id}:`, error);
    }
  },

  async checkCampaignDeadlines(guildId: string) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const campaigns = await prisma.campaign.findMany({
        where: {
          guildId,
          status: 'ACTIVE',
          endsAt: {
            gt: tomorrow,
            lte: dayAfterTomorrow
          }
        }
      });

      for (const campaign of campaigns) {
        await this.createReminder({
          guildId,
          type: 'campaign_deadline',
          message: `Campaign **${campaign.name}** is ending soon! Deadline: <t:${Math.floor((campaign.endsAt?.getTime() || 0) / 1000)}:R>`,
          scheduledAt: tomorrow
        });
      }
    } catch (error) {
      logger.error(`Error checking campaign deadlines for guild ${guildId}:`, error);
    }
  }
};
