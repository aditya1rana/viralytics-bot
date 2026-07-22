import express from 'express';
import cors from 'cors';
import { prisma } from '../services/database.js';
import { config } from '../config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { submissionService } from '../modules/submissions/services/submissionService.js';
import { payoutService } from '../modules/payouts/services/payoutService.js';
import { ensureDefaultAdmin, hashPassword, verifyPassword } from '../services/authService.js';
import { generateSubmissionsCSV, SubmissionCSVData } from '../services/csvExporterService.js';
import { viewFetcherService } from '../services/viewFetcherService.js';
import { setGuildSubscription, syncGuildsWithDiscord } from '../services/subscriptionGuard.js';
import logger from '../services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createDashboardApp(discordClient?: any) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Initialize master admin user on launch
  ensureDefaultAdmin();

  // Auth Middleware
  const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.replace(/^Bearer\s+/, '');
    
    // Support default legacy password token or username/password token
    if (token === config.DASHBOARD_PASSWORD) {
      (req as any).user = { username: 'admin', role: 'SUPER_ADMIN' };
      next();
      return;
    }

    // Check token as base64 encoded username:hash
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [username] = decoded.split(':');
      const admin = await prisma.adminUser.findUnique({ where: { username } });
      if (admin) {
        (req as any).user = admin;
        next();
        return;
      }
    } catch {
      // Invalid format
    }

    res.status(401).json({ error: 'Unauthorized' });
  };

  // POST /api/auth/login (Username & Password)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      // Legacy single password fallback
      if (!username && password === config.DASHBOARD_PASSWORD) {
        res.json({ success: true, token: 'Bearer ' + config.DASHBOARD_PASSWORD, user: { username: 'admin', role: 'SUPER_ADMIN' } });
        return;
      }

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const admin = await prisma.adminUser.findUnique({ where: { username } });
      if (!admin || !verifyPassword(password, admin.passwordHash)) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      const token = Buffer.from(`${admin.username}:${admin.passwordHash}`).toString('base64');
      res.json({
        success: true,
        token: `Bearer ${token}`,
        user: { username: admin.username, role: admin.role, guildId: admin.guildId }
      });
    } catch (error) {
      logger.error('Error in login endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Legacy POST /api/auth fallback
  app.post('/api/auth', async (req, res) => {
    const { username, password } = req.body;
    if (password === config.DASHBOARD_PASSWORD) {
      res.json({ success: true, token: 'Bearer ' + config.DASHBOARD_PASSWORD });
      return;
    }
    if (username && password) {
      const admin = await prisma.adminUser.findUnique({ where: { username } });
      if (admin && verifyPassword(password, admin.passwordHash)) {
        const token = Buffer.from(`${admin.username}:${admin.passwordHash}`).toString('base64');
        res.json({ success: true, token: 'Bearer ' + token });
        return;
      }
    }
    res.status(401).json({ success: false, error: 'Invalid credentials' });
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

  // GET /api/campaigns (Rich Campaigns List with Metrics)
  app.get('/api/campaigns', authMiddleware, async (req, res) => {
    try {
      const campaigns = await prisma.campaign.findMany({
        where: { guildId },
        include: {
          submissions: {
            select: {
              id: true,
              status: true,
              viewsCount: true,
              likesCount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = campaigns.map(c => {
        const totalVideos = c.submissions.length;
        const approvedSubs = c.submissions.filter(s => s.status === 'APPROVED');
        const approvedVideos = approvedSubs.length;
        
        // Sum total views from approved submissions
        const viewsCompleted = approvedSubs.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
        
        const viewsGoalNum = c.viewsGoal ? Number(c.viewsGoal) : 0;
        const goalProgress = viewsGoalNum > 0 
          ? Math.min(100, Math.round((viewsCompleted / viewsGoalNum) * 100)) 
          : 0;

        const cpm = c.cpmRate ? Number(c.cpmRate) : 0;
        const contract = c.contractValue ? Number(c.contractValue) : 0;
        
        // Spend forecast = (viewsCompleted / 1000) * cpmRate
        const spendForecast = cpm > 0 ? (viewsCompleted / 1000) * cpm : 0;
        const remainingBudget = contract > 0 ? Math.max(0, contract - spendForecast) : 0;

        return {
          id: c.id,
          name: c.name,
          brandName: c.brandName || '',
          description: c.description || '',
          instructions: c.instructions || '',
          rules: c.rules || '',
          internalNotes: c.internalNotes || '',
          status: c.status,
          platforms: c.platforms,
          contractValue: contract,
          viewsGoal: viewsGoalNum,
          cpmRate: cpm,
          payPerApproved: c.payPerApproved ? Number(c.payPerApproved) : 0,
          currency: c.currency,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          totalVideos,
          approvedVideos,
          viewsCompleted,
          goalProgress,
          spendForecast,
          remainingBudget,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        };
      });

      res.json(formatted);
    } catch (error) {
      logger.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/campaigns (Create Rich Campaign)
  app.post('/api/campaigns', authMiddleware, async (req, res) => {
    try {
      const {
        name,
        brandName,
        description,
        instructions,
        rules,
        internalNotes,
        contractValue,
        viewsGoal,
        cpmRate,
        payPerApproved,
        platforms,
        status,
        startsAt,
        endsAt
      } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Campaign name is required' });
        return;
      }

      const campaign = await prisma.campaign.create({
        data: {
          guildId,
          name,
          brandName: brandName || null,
          description: description || null,
          instructions: instructions || null,
          rules: rules || null,
          internalNotes: internalNotes || null,
          contractValue: contractValue ? parseFloat(contractValue) : null,
          viewsGoal: viewsGoal ? BigInt(viewsGoal) : null,
          cpmRate: cpmRate ? parseFloat(cpmRate) : null,
          payPerApproved: payPerApproved ? parseFloat(payPerApproved) : null,
          platforms: platforms || ['INSTAGRAM_REELS', 'TIKTOK', 'YOUTUBE_SHORTS'],
          status: status || 'ACTIVE',
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          createdBy: (req as any).user?.username || 'Dashboard',
        }
      });

      res.json(campaign);
    } catch (error: any) {
      logger.error('Error creating campaign:', error);
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'A campaign with this name already exists in this server.' });
        return;
      }
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // PUT /api/campaigns/:id (Update Campaign)
  app.put('/api/campaigns/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        brandName,
        description,
        instructions,
        rules,
        internalNotes,
        contractValue,
        viewsGoal,
        cpmRate,
        payPerApproved,
        platforms,
        status,
        startsAt,
        endsAt
      } = req.body;

      const campaign = await prisma.campaign.update({
        where: { id: id as string },
        data: {
          ...(name && { name }),
          brandName: brandName !== undefined ? brandName : undefined,
          description: description !== undefined ? description : undefined,
          instructions: instructions !== undefined ? instructions : undefined,
          rules: rules !== undefined ? rules : undefined,
          internalNotes: internalNotes !== undefined ? internalNotes : undefined,
          contractValue: contractValue !== undefined ? (contractValue ? parseFloat(contractValue) : null) : undefined,
          viewsGoal: viewsGoal !== undefined ? (viewsGoal ? BigInt(viewsGoal) : null) : undefined,
          cpmRate: cpmRate !== undefined ? (cpmRate ? parseFloat(cpmRate) : null) : undefined,
          payPerApproved: payPerApproved !== undefined ? (payPerApproved ? parseFloat(payPerApproved) : null) : undefined,
          ...(platforms && { platforms }),
          ...(status && { status }),
          startsAt: startsAt !== undefined ? (startsAt ? new Date(startsAt) : null) : undefined,
          endsAt: endsAt !== undefined ? (endsAt ? new Date(endsAt) : null) : undefined,
        }
      });

      res.json(campaign);
    } catch (error: any) {
      logger.error('Error updating campaign:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // POST /api/campaigns/:id/status
  app.post('/api/campaigns/:id/status', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'CLOSED'].includes(status)) {
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

  // GET /api/submissions (List Submissions with filter & search)
  app.get('/api/submissions', authMiddleware, async (req, res) => {
    try {
      const statusFilter = req.query.status as string | undefined;
      const campaignIdFilter = req.query.campaignId as string | undefined;
      const search = req.query.search as string | undefined;

      const whereClause: any = { guildId };
      if (statusFilter && statusFilter !== 'ALL') {
        whereClause.status = statusFilter;
      }
      if (campaignIdFilter) {
        whereClause.campaignId = campaignIdFilter;
      }
      if (search && search.trim()) {
        whereClause.OR = [
          { originalUrl: { contains: search, mode: 'insensitive' } },
          { creatorHandle: { contains: search, mode: 'insensitive' } },
          { user: { username: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const submissions = await prisma.submission.findMany({
        where: whereClause,
        include: {
          user: true,
          campaign: true
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = submissions.map(sub => ({
        id: sub.id,
        shortId: sub.shortId,
        guildId: sub.guildId,
        userId: sub.userId,
        creatorUsername: sub.user?.username || 'Unknown',
        creatorTag: sub.user?.username ? `@${sub.user.username}` : `<@${sub.userId}>`,
        creatorAvatar: sub.user?.avatarUrl,
        creatorHandle: sub.creatorHandle || viewFetcherService.extractHandleFromUrl(sub.originalUrl) || 'creator',
        campaignId: sub.campaignId,
        campaignName: sub.campaign?.name || 'Unknown Campaign',
        brandName: sub.campaign?.brandName || '',
        platform: sub.platform,
        originalUrl: sub.originalUrl,
        viewsCount: sub.viewsCount || 0,
        likesCount: sub.likesCount || 0,
        thumbnailUrl: sub.thumbnailUrl || (sub.platform === 'YOUTUBE_SHORTS' ? `https://i.ytimg.com/vi/${sub.originalUrl.match(/shorts\/([a-zA-Z0-9_-]+)/)?.[1] || ''}/hqdefault.jpg` : null),
        status: sub.status,
        notes: sub.notes,
        reviewedBy: sub.reviewedBy,
        reviewedAt: sub.reviewedAt,
        reviewNote: sub.reviewNote,
        createdAt: sub.createdAt
      }));

      res.json(formatted);
    } catch (error) {
      logger.error('Error fetching submissions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/submissions/pending (Legacy fallback)
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
      const { viewsCount } = req.body || {};

      if (viewsCount !== undefined && typeof viewsCount === 'number') {
        await prisma.submission.update({
          where: { id: id as string },
          data: { viewsCount }
        });
      }

      const submission = await submissionService.approveSubmission(id as string, (req as any).user?.username || 'Dashboard');
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
      const submission = await submissionService.rejectSubmission(id as string, (req as any).user?.username || 'Dashboard', reason);
      res.json({ success: true, submission });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to reject submission' });
    }
  });

  // POST /api/submissions/:id/views (Manually update views count)
  app.post('/api/submissions/:id/views', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { viewsCount, likesCount } = req.body;

      const submission = await prisma.submission.update({
        where: { id: id as string },
        data: {
          ...(viewsCount !== undefined && { viewsCount: parseInt(viewsCount, 10) || 0 }),
          ...(likesCount !== undefined && { likesCount: parseInt(likesCount, 10) || 0 })
        }
      });
      res.json({ success: true, submission });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update views' });
    }
  });

  // GET /api/submissions/export/csv (CSV Export tool)
  app.get('/api/submissions/export/csv', authMiddleware, async (req, res) => {
    try {
      const statusFilter = req.query.status as string | undefined;
      const campaignIdFilter = req.query.campaignId as string | undefined;

      const whereClause: any = { guildId };
      if (statusFilter && statusFilter !== 'ALL') {
        whereClause.status = statusFilter;
      }
      if (campaignIdFilter) {
        whereClause.campaignId = campaignIdFilter;
      }

      const submissions = await prisma.submission.findMany({
        where: whereClause,
        include: {
          user: true,
          campaign: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const csvData: SubmissionCSVData[] = submissions.map(s => ({
        id: s.id,
        shortId: s.shortId,
        creatorUsername: s.user?.username || 'Unknown',
        creatorTag: `@${s.user?.username || 'user'}`,
        creatorId: s.userId,
        creatorHandle: s.creatorHandle || viewFetcherService.extractHandleFromUrl(s.originalUrl) || 'N/A',
        campaignName: s.campaign?.name || 'N/A',
        brandName: s.campaign?.brandName || 'N/A',
        platform: s.platform,
        originalUrl: s.originalUrl,
        viewsCount: s.viewsCount || 0,
        likesCount: s.likesCount || 0,
        status: s.status,
        submittedAt: s.createdAt.toISOString(),
        reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : undefined,
        reviewedBy: s.reviewedBy || undefined
      }));

      const csvString = generateSubmissionsCSV(csvData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=viralytics-submissions-${statusFilter || 'ALL'}-${Date.now()}.csv`);
      res.status(200).send(csvString);
    } catch (error) {
      logger.error('Error exporting CSV:', error);
      res.status(500).json({ error: 'Failed to generate CSV export' });
    }
  });

  // GET /api/creators (Creator Analytics & Account Tracking)
  app.get('/api/creators', authMiddleware, async (req, res) => {
    try {
      const members = await prisma.member.findMany({
        where: { guildId },
        include: {
          user: {
            include: {
              submissions: {
                where: { guildId },
                include: { campaign: true }
              }
            }
          }
        }
      });

      const creators = members.map(m => {
        const subs = m.user.submissions || [];
        const approvedSubs = subs.filter(s => s.status === 'APPROVED');
        const totalViews = approvedSubs.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);

        // Collect unique social media handles submitted by this creator
        const socialHandlesSet = new Set<string>();
        subs.forEach(s => {
          if (s.creatorHandle) socialHandlesSet.add(s.creatorHandle);
          const parsed = viewFetcherService.extractHandleFromUrl(s.originalUrl);
          if (parsed) socialHandlesSet.add(parsed);
        });

        return {
          userId: m.userId,
          username: m.user.username,
          tag: `@${m.user.username}`,
          avatarUrl: m.user.avatarUrl,
          totalSubmissions: subs.length,
          approvedSubmissions: approvedSubs.length,
          rejectedSubmissions: subs.filter(s => s.status === 'REJECTED').length,
          pendingSubmissions: subs.filter(s => s.status === 'PENDING').length,
          totalViewsGenerated: totalViews,
          socialHandles: Array.from(socialHandlesSet),
          submissions: subs.map(s => ({
            id: s.id,
            campaignName: s.campaign?.name || 'N/A',
            platform: s.platform,
            url: s.originalUrl,
            viewsCount: s.viewsCount || 0,
            status: s.status,
            createdAt: s.createdAt
          }))
        };
      });

      // Sort creators by total views generated descending
      creators.sort((a, b) => b.totalViewsGenerated - a.totalViewsGenerated);

      res.json(creators);
    } catch (error) {
      logger.error('Error fetching creator analytics:', error);
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
      await payoutService.approvePayout(id as string, (req as any).user?.username || 'Dashboard');
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

  // GET /api/auth/invite-link (Public endpoint for inviting the bot)
  app.get('/api/auth/invite-link', (req, res) => {
    const clientId = config.DISCORD_CLIENT_ID || '1528892453287886898';
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    res.json({ inviteUrl, clientId });
  });

  // GET /api/admin/subscriptions (Master Admin: List all servers and subscription statuses)
  app.get('/api/admin/subscriptions', authMiddleware, async (req, res) => {
    try {
      if (discordClient) {
        await syncGuildsWithDiscord(discordClient);
      }

      const guilds = await prisma.guild.findMany({
        orderBy: { joinedAt: 'desc' },
        include: {
          _count: {
            select: { members: true, campaigns: true }
          }
        }
      });

      res.json(guilds.map(g => ({
        id: g.id,
        name: g.name,
        iconUrl: g.iconUrl,
        ownerId: g.ownerId,
        joinedAt: g.joinedAt,
        isSubscribed: g.isSubscribed,
        subscriptionTier: g.subscriptionTier,
        subscriptionExpiresAt: g.subscriptionExpiresAt,
        memberCount: g._count.members,
        campaignCount: g._count.campaigns,
        isPrimaryOwnerServer: g.id === config.DISCORD_GUILD_ID,
      })));
    } catch (error: any) {
      logger.error('Error fetching admin subscriptions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/admin/subscriptions/:targetGuildId/toggle (Master Admin: Toggle server subscription with duration options)
  app.post('/api/admin/subscriptions/:targetGuildId/toggle', authMiddleware, async (req, res) => {
    try {
      const guildIdStr = String(req.params.targetGuildId);
      const { isSubscribed, durationDays, customExpiresAt, subscriptionTier } = req.body;

      const updatedState = typeof isSubscribed === 'boolean' ? isSubscribed : true;
      await setGuildSubscription(guildIdStr, updatedState, {
        durationDays: durationDays ? parseInt(durationDays, 10) : undefined,
        customExpiresAt,
        subscriptionTier,
      });

      const updatedGuild = await prisma.guild.findUnique({
        where: { id: guildIdStr }
      });

      res.json(updatedGuild);
    } catch (error: any) {
      logger.error('Error updating subscription state:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
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
