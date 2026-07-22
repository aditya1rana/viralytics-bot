import crypto from 'node:crypto';
import prisma from './database.js';
import logger from './logger.js';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export async function ensureDefaultAdmin(): Promise<void> {
  try {
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0) {
      const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.DASHBOARD_PASSWORD || process.env.ADMIN_PASSWORD || 'viralytics123';

      await prisma.adminUser.create({
        data: {
          username: defaultUsername,
          passwordHash: hashPassword(defaultPassword),
          role: 'SUPER_ADMIN'
        }
      });
      logger.info(`Initialized default SUPER_ADMIN user: ${defaultUsername}`);
    }
  } catch (err) {
    logger.error('Failed to ensure default admin user:', err);
  }
}
