import express from 'express';
import cors from 'cors';
import { prisma } from '../services/database.js';
import { config } from '../config.js';
import path from 'path';
import { fileURLToPath } from 'url';

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
      res.json({ success: true });
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
      res.json(guildConfig || {});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/config
  app.post('/api/config', authMiddleware, async (req, res) => {
    try {
      const data = req.body;
      const guildConfig = await prisma.guildConfig.upsert({
        where: { guildId: '1520755756800933938' },
        update: data,
        create: { guildId: '1520755756800933938', ...data },
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


  // Serve static files
  app.use(express.static(path.join(__dirname, '..', '..', 'dashboard', 'dist')));
  
  // Catch all to serve frontend
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'dashboard', 'dist', 'index.html'));
  });

  return app;
}
