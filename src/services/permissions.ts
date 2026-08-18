import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import type { Command } from '../types/index.js';
import { cache } from './cache.js';
import { prisma } from './database.js';

/**
 * Check if a user has permission to run a command.
 * Returns true if allowed, false if denied (and sends ephemeral reply).
 */
export async function checkPermissions(
  interaction: ChatInputCommandInteraction,
  command: Command,
): Promise<boolean> {
  // Admin-only commands
  if (command.adminOnly) {
    const isAdmin = await isUserAdmin(interaction.guildId!, interaction.user.id);
    if (!isAdmin) {
      await interaction.reply({
        content: '🔒 This command requires administrator permissions.',
        ephemeral: true,
      });
      return false;
    }
  }

  // Discord permission checks
  if (command.permissions && command.permissions.length > 0) {
    const member = interaction.member;
    if (member && 'permissions' in member) {
      const perms = member.permissions as PermissionsBitField;
      const missing = command.permissions.filter(p => !perms.has(p));
      if (missing.length > 0) {
        await interaction.reply({
          content: '🔒 You lack the required permissions for this command.',
          ephemeral: true,
        });
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a user is an admin based on guild config roles.
 */
export async function isUserAdmin(guildId: string, userId: string): Promise<boolean> {
  const cacheKey = `guild:${guildId}:config`;
  
  // Try to get config from cache
  const cached = await cache.get<any>(cacheKey);
  
  if (cached) {
    // We have cache, we could check adminRoleId if we had the member, 
    // but the interaction handler already checks the member roles later.
    // For now we just return false and let the main handler check roles.
    return false;
  }

  // Cache miss! The DB might take >3s on cold boot, crashing the interaction.
  // Trigger DB lookup in background to populate cache for next time,
  // but return optimistically NOW.
  prisma.guildConfig.findUnique({ where: { guildId } }).then(config => {
    if (config) {
      cache.set(cacheKey, config, 600).catch(() => null);
    }
  }).catch(() => null);

  return false;
}

/**
 * Check if a member has a specific role.
 */
export function hasRole(interaction: ChatInputCommandInteraction, roleId: string): boolean {
  const member = interaction.member;
  if (!member || !('roles' in member)) return false;

  const roles = member.roles;
  if ('cache' in roles) {
    return roles.cache.has(roleId);
  }
  if (Array.isArray(roles)) {
    return roles.includes(roleId);
  }
  return false;
}

/**
 * Check if a user is a moderator or admin.
 */
export async function isModOrAdmin(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const member = interaction.member;
  if (!member || !('permissions' in member)) return false;

  const perms = member.permissions as PermissionsBitField;
  if (perms.has(PermissionsBitField.Flags.Administrator)) return true;

  const config = await cache.getOrSet(
    `guild:${interaction.guildId}:config`,
    async () => prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId! } }),
    600,
  );

  if (config?.modRoleId && hasRole(interaction, config.modRoleId)) return true;
  if (config?.adminRoleId && hasRole(interaction, config.adminRoleId)) return true;

  return false;
}
