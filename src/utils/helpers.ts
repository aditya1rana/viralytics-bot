import { Guild, TextChannel, GuildMember } from 'discord.js';
import { prisma } from '../services/database.js';

/**
 * Ensure a User row exists in the database.
 */
export async function ensureUser(member: GuildMember | any) {
  const discordCreatedAt = member.user?.createdAt || member.createdAt || new Date();
  const userId = member.user?.id || member.id;
  const username = member.user?.username || member.username || `user_${userId}`;
  const discriminator = member.user?.discriminator || member.discriminator || '0';
  const globalName = member.user?.globalName ?? member.globalName ?? null;
  const avatarUrl = typeof member.user?.displayAvatarURL === 'function' 
    ? member.user.displayAvatarURL() 
    : (typeof member.displayAvatarURL === 'function' ? member.displayAvatarURL() : null);

  return prisma.user.upsert({
    where: { id: userId },
    update: {
      username,
      globalName,
      avatarUrl,
    },
    create: {
      id: userId,
      username,
      discriminator,
      globalName,
      avatarUrl,
      accountCreatedAt: discordCreatedAt,
    },
  });
}

/**
 * Ensure a Guild row exists in the database.
 */
export async function ensureGuild(guild: Guild | any) {
  const guildId = guild.id;
  const name = guild.name || 'Discord Server';
  const iconUrl = typeof guild.iconURL === 'function' ? guild.iconURL() : null;
  const ownerId = guild.ownerId || 'unknown';

  return prisma.guild.upsert({
    where: { id: guildId },
    update: {
      name,
      iconUrl,
      ownerId,
    },
    create: {
      id: guildId,
      name,
      iconUrl,
      ownerId,
    },
  });
}

/**
 * Ensure a Member row exists for a user in a guild.
 * Automatically guarantees both Guild and User rows exist to prevent Foreign Key errors.
 */
export async function ensureMember(guildId: string, userId: string, memberOrUser?: any) {
  // 1. Guarantee Guild exists
  await prisma.guild.upsert({
    where: { id: guildId },
    update: {},
    create: {
      id: guildId,
      name: memberOrUser?.guild?.name || 'Discord Server',
      ownerId: memberOrUser?.guild?.ownerId || 'unknown',
    },
  });

  // 2. Guarantee User exists before creating Member
  if (memberOrUser?.user || (memberOrUser && memberOrUser.id === userId && memberOrUser.username)) {
    await ensureUser(memberOrUser);
  } else {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        username: `user_${userId}`,
        discriminator: '0',
        accountCreatedAt: new Date(),
      },
    });
  }

  // 3. Upsert Member
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
