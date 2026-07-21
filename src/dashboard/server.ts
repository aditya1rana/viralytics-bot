import express from 'express';
import cors from 'cors';
import { prisma } from '../services/database.js';
import { config } from '../config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { submissionService } from '../modules/submissions/services/submissionService.js';
import { payoutService } from '../modules/payouts/services/payoutService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createDashboardApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Simple Auth Middleware
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const token = authHeader.split(' ')[1];
    if (token !== config.DASHBOARD_PASSWORD) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };

  // POST /api/auth
  app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (password === config.DASHBOARD_PASSWORD) {
      res.json({ success: true, token: 'Bearer ' + password });
      return;
    }
    res.status(401).json({ success: false, error: 'Invalid password' });
  });

  const guildId = config.DISCORD_GUILD_ID;

  // GET /api/stats
  app.get('/api/stats', authMiddleware, async (req, res) => {
    try {
      const [
        totalMembers,
        verifiedMembers,
        unverifiedMembers,
        totalSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        pendingSubmissions,
        totalCampaigns,
        activeCampaigns,
        totalTickets,
        openTickets,
      ] = await Promise.all([
        prisma.member.count({ where: { guildId } }),
        prisma.member.count({ where: { guildId, verificationStatus: 'VERIFIED' } }),
        prisma.member.count({ where: { guildId, verificationStatus: 'UNVERIFIED' } }),
        prisma.submission.count({ where: { guildId } }),
        prisma.submission.count({ where: { guildId, status: 'APPROVED' } }),
        prisma.submission.count({ where: { guildId, status: 'REJECTED' } }),
        prisma.submission.count({ where: { guildId, status: 'PENDING' } }),
        prisma.campaign.count({ where: { guildId } }),
        prisma.campaign.count({ where: { guildId, status: 'ACTIVE' } }),
        prisma.ticket.count({ where: { guildId } }),
        prisma.ticket.count({ where: { guildId, status: 'OPEN' } }),
      ]);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActivityCount = await prisma.submission.count({
        where: {
          guildId,
          createdAt: { gte: twentyFourHoursAgo },
        },
      });

      res.json({
        members: { total: totalMembers, verified: verifiedMembers, unverified: unverifiedMembers },
        submissions: { total: totalSubmissions, approved: approvedSubmissions, rejected: rejectedSubmissions, pending: pendingSubmissions },
        campaigns: { total: totalCampaigns, active: activeCampaigns },
        tickets: { total: totalTickets, open: openTickets },
        recentActivityCount,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/logs
  app.get('/api/logs', authMiddleware, async (req, res) => {
    try {
      const type = req.query.type as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      if (type === 'audit') {
        const [logs, total] = await Promise.all([
          prisma.auditLog.findMany({
            where: { guildId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { actor: true },
          }),
          prisma.auditLog.count({ where: { guildId } })
        ]);
        res.json({ data: logs, total, page, limit });
        return;
      }

      if (type === 'submissions') {
        const [submissions, total] = await Promise.all([
          prisma.submission.findMany({
            where: { guildId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { user: true, campaign: true },
          }),
          prisma.submission.count({ where: { guildId } })
        ]);
        res.json({ data: submissions, total, page, limit });
        return;
      }

      if (type === 'verifications') {
        const [verifications, total] = await Promise.all([
          prisma.member.findMany({
            where: { guildId, verificationStatus: 'VERIFIED' },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit,
            include: { user: true },
          }),
          prisma.member.count({ where: { guildId, verificationStatus: 'VERIFIED' } })
        ]);
        res.json({ data: verifications, total, page, limit });
        return;
      }

      res.status(400).json({ error: 'Invalid log type' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/config
  app.get('/api/config', authMiddleware, async (req, res) => {
    try {
      const guildConfig = await prisma.guildConfig.findUnique({
        where: { guildId: '1520755756800933938' },
      });
      if (!guildConfig) {
        res.json({});
        return;
      }
      
      const grouped = {
        General: {
          prefix: guildConfig.prefix,
          language: guildConfig.language,
          timezone: guildConfig.timezone,
        },
        Roles: {
          verifiedRoleId: guildConfig.verifiedRoleId,
          unverifiedRoleId: guildConfig.unverifiedRoleId,
          mutedRoleId: guildConfig.mutedRoleId,
          modRoleId: guildConfig.modRoleId,
          adminRoleId: guildConfig.adminRoleId,
          clipperRoleId: guildConfig.clipperRoleId,
        },
        Channels: {
          welcomeChannelId: guildConfig.welcomeChannelId,
          verificationChannelId: guildConfig.verificationChannelId,
          submissionChannelId: guildConfig.submissionChannelId,
          leaderboardChannelId: guildConfig.leaderboardChannelId,
          ticketCategoryId: guildConfig.ticketCategoryId,
          verificationLogChannelId: guildConfig.verificationLogChannelId,
          ticketLogChannelId: guildConfig.ticketLogChannelId,
          submissionLogChannelId: guildConfig.submissionLogChannelId,
          duplicateLogChannelId: guildConfig.duplicateLogChannelId,
          moderationLogChannelId: guildConfig.moderationLogChannelId,
          campaignLogChannelId: guildConfig.campaignLogChannelId,
          errorLogChannelId: guildConfig.errorLogChannelId,
          staffActionLogChannelId: guildConfig.staffActionLogChannelId,
        },
        Verification: {
          minAccountAgeDays: guildConfig.minAccountAgeDays,
          altDetectionEnabled: guildConfig.altDetectionEnabled,
          verificationEnabled: guildConfig.verificationEnabled,
          captchaEnabled: guildConfig.captchaEnabled,
        },
        XP: {
          xpPerMessage: guildConfig.xpPerMessage,
          xpPerSubmission: guildConfig.xpPerSubmission,
          xpPerVerification: guildConfig.xpPerVerification,
          xpCooldownSeconds: guildConfig.xpCooldownSeconds,
          levelUpAnnouncementEnabled: guildConfig.levelUpAnnouncementEnabled,
        },
        Submissions: {
          maxDailySubmissions: guildConfig.maxDailySubmissions,
          duplicateCheckEnabled: guildConfig.duplicateCheckEnabled,
          autoApproveEnabled: guildConfig.autoApproveEnabled,
        },
        Moderation: {
          autoModEnabled: guildConfig.autoModEnabled,
          maxWarnsBeforeMute: guildConfig.maxWarnsBeforeMute,
          maxWarnsBeforeBan: guildConfig.maxWarnsBeforeBan,
          muteDefaultMinutes: guildConfig.muteDefaultMinutes,
          timeoutDefaultMinutes: guildConfig.timeoutDefaultMinutes,
          antiRaidEnabled: guildConfig.antiRaidEnabled,
          antiSpamEnabled: guildConfig.antiSpamEnabled,
          antiScamEnabled: guildConfig.antiScamEnabled,
        },
        Payouts: {
          defaultCurrency: guildConfig.defaultCurrency,
        }
      };

      res.json(grouped);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/config
  app.post('/api/config', authMiddleware, async (req, res) => {
    try {
      const data = req.body;
      const flatData: any = {};
      for (const section of Object.values(data)) {
        if (typeof section === 'object' && section !== null) {
          for (const [key, val] of Object.entries(section)) {
            flatData[key] = val;
          }
        }
      }

      const guildConfig = await prisma.guildConfig.upsert({
        where: { guildId: '1520755756800933938' },
        update: flatData,
        create: { guildId: '1520755756800933938', ...flatData },
      });
      res.json(guildConfig);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/campaigns
  app.get('/api/campaigns', authMiddleware, async (req, res) => {
    try {
      const campaigns = await prisma.campaign.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
      });
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/campaigns/:id/status
  app.post('/api/campaigns/:id/status', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['ACTIVE', 'PAUSED', 'ARCHIVED', 'CLOSED'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const campaign = await prisma.campaign.findUnique({ where: { id: id as string } });
      if (!campaign || campaign.guildId !== guildId) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      
      const updatedCampaign = await prisma.campaign.update({
        where: { id: id as string },
        data: { status },
      });
      res.json(updatedCampaign);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/members
  app.get('/api/members', authMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as any as string | undefined;
      const skip = (page - 1) * limit;

      const whereClause: any = { guildId };
      if (search && typeof search === 'string') {
        whereClause.user = {
          username: {
            contains: search,
            mode: 'insensitive',
          },
        };
      }

      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: { user: true },
        }),
        prisma.member.count({ where: whereClause })
      ]);

      res.json({ data: members, total, page, limit });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/campaigns
  app.post('/api/campaigns', authMiddleware, async (req, res) => {
    try {
      const { name, description, payPerApproved, platforms, guidelines } = req.body;
      const campaign = await prisma.campaign.create({
        data: {
          guildId,
          name,
          description,
          payPerApproved: payPerApproved ? parseFloat(payPerApproved) : null,
          platforms: platforms || [],
          guidelines,
          status: 'ACTIVE',
          createdBy: 'Dashboard',
        }
      });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/submissions/pending
  app.get('/api/submissions/pending', authMiddleware, async (req, res) => {
    try {
      const submissions = await prisma.submission.findMany({
        where: { guildId, status: 'PENDING' },
        include: { user: true, campaign: true },
        orderBy: { createdAt: 'asc' },
      });
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/submissions/:id/approve
  app.post('/api/submissions/:id/approve', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await submissionService.approveSubmission(id as string, 'Dashboard');
      res.json({ success: true, submission });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to approve submission' });
    }
  });

  // POST /api/submissions/:id/reject
  app.post('/api/submissions/:id/reject', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const submission = await submissionService.rejectSubmission(id as string, 'Dashboard', reason);
      res.json({ success: true, submission });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to reject submission' });
    }
  });

  // GET /api/payouts
  app.get('/api/payouts', authMiddleware, async (req, res) => {
    try {
      const payouts = await prisma.payout.findMany({
        where: { guildId },
        include: { user: true, campaign: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json(payouts);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/payouts/calculate
  app.post('/api/payouts/calculate', authMiddleware, async (req, res) => {
    try {
      const { campaignId } = req.body;
      const createdCount = await payoutService.calculatePayouts(campaignId);
      res.json({ success: true, createdCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to calculate payouts' });
    }
  });

  // POST /api/payouts/:id/pay
  app.post('/api/payouts/:id/pay', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      await payoutService.approvePayout(id as string, 'Dashboard');
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to process payout' });
    }
  });

  // GET /api/stats/activity
  app.get('/api/stats/activity', authMiddleware, async (req, res) => {
    try {
      const activity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        
        const count = await prisma.submission.count({
          where: {
            guildId,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            }
          }
        });
        
        activity.push({ date: dateString, count });
      }
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/leaderboards
  app.get('/api/leaderboards', authMiddleware, async (req, res) => {
    try {
      const [xpLeaderboard, submissionLeaderboard, allMembers] = await Promise.all([
        prisma.member.findMany({
          where: { guildId },
          orderBy: { totalXp: 'desc' },
          take: 50,
          include: { user: true }
        }),
        prisma.member.findMany({
          where: { guildId },
          orderBy: { totalSubmissions: 'desc' },
          take: 50,
          include: { user: true }
        }),
        prisma.member.findMany({
          where: { guildId },
          include: { user: true }
        })
      ]);

      // Calculate valid invites and sort for invite leaderboard
      const sortedInvitees = allMembers
        .map(m => {
          const validInvites = (m.totalInvites + m.bonusInvites) - m.leftInvites - m.fakeInvites;
          return {
            userId: m.userId,
            username: m.user?.username || 'Unknown',
            avatarUrl: m.user?.avatarUrl,
            totalInvites: m.totalInvites,
            bonusInvites: m.bonusInvites,
            leftInvites: m.leftInvites,
            fakeInvites: m.fakeInvites,
            validInvites
          };
        })
        .sort((a, b) => b.validInvites - a.validInvites)
        .slice(0, 50);

      res.json({
        xpLeaderboard: xpLeaderboard.map((m, idx) => ({
          userId: m.userId,
          username: m.user?.username || 'Unknown',
          avatarUrl: m.user?.avatarUrl,
          totalXp: m.totalXp,
          level: m.level,
          rank: idx + 1
        })),
        submissionLeaderboard: submissionLeaderboard.map((m, idx) => ({
          userId: m.userId,
          username: m.user?.username || 'Unknown',
          avatarUrl: m.user?.avatarUrl,
          totalSubmissions: m.totalSubmissions,
          approvedSubmissions: m.approvedSubmissions,
          rank: idx + 1
        })),
        inviteLeaderboard: sortedInvitees.map((m, idx) => ({
          ...m,
          rank: idx + 1
        }))
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Serve static files
  app.use(express.static(path.join(__dirname, '..', '..', 'dashboard', 'dist')));
  
  // Catch all to serve frontend
  app.get('*all', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'dashboard', 'dist', 'index.html'));
  });

  return app;
}
