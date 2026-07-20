import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { COLORS } from '../utils/colors.js';

export function createEmbed(options: {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  thumbnail?: string;
  image?: string;
  timestamp?: boolean;
  author?: { name: string; iconURL?: string; url?: string };
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(options.color ?? COLORS.PRIMARY);

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.footer) embed.setFooter({ text: options.footer, iconURL: undefined });
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.timestamp) embed.setTimestamp();
  if (options.author) embed.setAuthor(options.author);

  if (options.fields) {
    for (const field of options.fields) {
      embed.addFields({ name: field.name, value: field.value, inline: field.inline ?? false });
    }
  }

  return embed;
}

export const buildEmbed = createEmbed;

export function successEmbed(title: string, description?: string): EmbedBuilder {
  return createEmbed({ title: `✅ ${title}`, description, color: COLORS.SUCCESS, timestamp: true });
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
  return createEmbed({ title: `❌ ${title}`, description, color: COLORS.ERROR, timestamp: true });
}

export function warnEmbed(title: string, description?: string): EmbedBuilder {
  return createEmbed({ title: `⚠️ ${title}`, description, color: COLORS.WARNING, timestamp: true });
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
  return createEmbed({ title: `ℹ️ ${title}`, description, color: COLORS.INFO, timestamp: true });
}

export function submissionEmbed(data: {
  user: string;
  campaign: string;
  platform: string;
  link: string;
  submissionId: string;
  status: string;
  notes?: string;
}): EmbedBuilder {
  return createEmbed({
    title: '📎 New Link Submission',
    color: COLORS.PRIMARY,
    fields: [
      { name: '👤 Clipper', value: data.user, inline: true },
      { name: '📋 Campaign', value: data.campaign, inline: true },
      { name: '📱 Platform', value: data.platform, inline: true },
      { name: '🔗 Link', value: data.link },
      { name: '🆔 Submission ID', value: `\`${data.submissionId}\``, inline: true },
      { name: '📊 Status', value: data.status, inline: true },
      ...(data.notes ? [{ name: '📝 Notes', value: data.notes }] : []),
    ],
    timestamp: true,
    footer: 'Viralytics Submissions',
  });
}

export function duplicateEmbed(data: {
  link: string;
  originalSubmitter: string;
  submissionDate: string;
  campaign: string;
  submissionId: string;
}): EmbedBuilder {
  return createEmbed({
    title: '🔁 Duplicate Link Detected',
    description: 'This link has already been submitted.',
    color: COLORS.ERROR,
    fields: [
      { name: '🔗 Link', value: data.link },
      { name: '👤 Original Submitter', value: data.originalSubmitter, inline: true },
      { name: '📅 Submission Date', value: data.submissionDate, inline: true },
      { name: '📋 Campaign', value: data.campaign, inline: true },
      { name: '🆔 Submission ID', value: `\`${data.submissionId}\``, inline: true },
    ],
    timestamp: true,
    footer: 'Viralytics • Duplicate Prevention',
  });
}

export function verificationEmbed(): EmbedBuilder {
  return createEmbed({
    title: '🛡️ Welcome to Viralytics!',
    description: [
      'Before accessing the server, you must verify yourself.',
      '',
      '**Server Rules:**',
      '• Be respectful to all members',
      '• No spam or self-promotion',
      '• Submit only original content',
      '• Follow campaign guidelines',
      '• Do not submit duplicate links',
      '',
      'Click the button below to verify your identity.',
    ].join('\n'),
    color: COLORS.PRIMARY,
    thumbnail: undefined,
    footer: 'Viralytics Verification System',
    timestamp: true,
  });
}

export function profileEmbed(data: {
  username: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  xpToNext: number;
  rank: number;
  totalSubmissions: number;
  approved: number;
  rejected: number;
  successRate: string;
  badges: string[];
  joinedAt: string;
}): EmbedBuilder {
  const progressBar = createProgressBar(data.xp % data.xpToNext, data.xpToNext);

  return createEmbed({
    author: { name: data.username, iconURL: data.avatarUrl },
    color: COLORS.PRIMARY,
    fields: [
      { name: '🏆 Rank', value: `#${data.rank}`, inline: true },
      { name: '⭐ Level', value: `${data.level}`, inline: true },
      { name: '✨ XP', value: `${data.xp.toLocaleString()}`, inline: true },
      { name: '📊 Progress', value: progressBar },
      { name: '📎 Submissions', value: `${data.totalSubmissions}`, inline: true },
      { name: '✅ Approved', value: `${data.approved}`, inline: true },
      { name: '❌ Rejected', value: `${data.rejected}`, inline: true },
      { name: '📈 Success Rate', value: data.successRate, inline: true },
      { name: '🎖️ Badges', value: data.badges.length > 0 ? data.badges.join(' ') : 'None yet' },
      { name: '📅 Joined', value: data.joinedAt, inline: true },
    ],
    footer: 'Viralytics Profile',
    timestamp: true,
  });
}

function createProgressBar(current: number, max: number, length = 20): string {
  const percentage = Math.min(current / max, 1);
  const filled = Math.round(percentage * length);
  const empty = length - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${Math.round(percentage * 100)}%`;
}

export const embedBuilder = {
  create: createEmbed,
  build: createEmbed,
  success: successEmbed,
  successEmbed,
  error: errorEmbed,
  errorEmbed,
  warn: warnEmbed,
  warnEmbed,
  info: infoEmbed,
  infoEmbed,
  submission: submissionEmbed,
  submissionEmbed,
  duplicate: duplicateEmbed,
  duplicateEmbed,
  verification: verificationEmbed,
  verificationEmbed,
  profile: profileEmbed,
  profileEmbed,
};

export default embedBuilder;
