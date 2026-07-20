import { AuditAction } from '@prisma/client';
import { prisma } from './database.js';
import { logger } from './logger.js';

/**
 * Log an action to the audit trail.
 */
export async function auditLog(data: {
  guildId: string;
  actorId?: string;
  action: AuditAction;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        guildId: data.guildId,
        actorId: data.actorId ?? null,
        action: data.action,
        targetId: data.targetId ?? null,
        targetType: data.targetType ?? null,
        metadata: data.metadata ? (data.metadata as any) : undefined,
        reason: data.reason ?? null,
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log:', err);
  }
}

export const auditLogger = auditLog;
export default auditLog;
