import { Guild, TextChannel, GuildMember } from 'discord.js';
import { prisma } from '../services/database.js';

/**
 * Ensure a User row exists in the database.
 */
export async function ensureUser(member: GuildMember) {
  const discordCreatedAt = member.user.createdAt;
  return prisma.user.upsert({
    where: { id: member.user.id },
    update: {
      username: member.user.username,
      globalName: member.user.globalName ?? null,
      avatarUrl: member.user.displayAvatarURL() ?? null,
    },
    create: {
      id: member.user.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      globalName: member.user.globalName ?? null,
      avatarUrl: member.user.displayAvatarURL() ?? null,
      accountCreatedAt: discordCreatedAt,
    },
  });
}

/**
 * Ensure a Guild row exists in the database.
 */
export async function ensureGuild(guild: Guild) {
  return prisma.guild.upsert({
    where: { id: guild.id },
    update: {
      name: guild.name,
      iconUrl: guild.iconURL() ?? null,
      ownerId: guild.ownerId,
    },
    create: {
      id: guild.id,
      name: guild.name,
      iconUrl: guild.iconURL() ?? null,
      ownerId: guild.ownerId,
    },
  });
}

/**
 * Ensure a Member row exists for a user in a guild.
 */
export async function ensureMember(guildId: string, userId: string) {
  return prisma.member.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: {},
    create: { guildId, userId },
  });
}

/**
 * Find a text channel by configured ID or by name.
 */
export function findLogChannel(guild: Guild, channelId?: string | null, channelName?: string): TextChannel | null {
  if (channelId) {
    const channel = guild.channels.cache.get(channelId);
    if (channel?.isTextBased()) return channel as TextChannel;
  }
  if (channelName) {
    const channel = guild.channels.cache.find(
      c => c.name === channelName && c.isTextBased()
    );
    if (channel) return channel as TextChannel;
  }
  return null;
}

/**
 * Format a Date to Discord timestamp.
 */
export function discordTimestamp(date: Date, style: 'R' | 'F' | 'D' | 'T' | 'f' | 'd' | 't' = 'R'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

/**
 * Truncate string to a max length.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a short ID using nanoid.
 */
export async function generateShortId(): Promise<string> {
  const { nanoid } = await import('nanoid');
  return nanoid(10);
}

/**
 * Calculate account age in days.
 */
export function accountAgeDays(createdAt: Date): number {
  const now = new Date();
  const diff = now.getTime() - createdAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Sleep for a number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
