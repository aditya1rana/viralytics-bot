export const BOT_NAME = 'Viralytics';
export const BOT_FOOTER = 'Viralytics Bot';
export const SUPPORT_URL = 'https://viralytics.com';

export const TICKET_CATEGORIES = [
  { label: '🛟 Support', value: 'SUPPORT', description: 'General support questions' },
  { label: '💰 Payment', value: 'PAYMENT', description: 'Payment and payout issues' },
  { label: '📋 Campaign Help', value: 'CAMPAIGN_HELP', description: 'Help with campaigns' },
  { label: '🤝 Partnership', value: 'PARTNERSHIP', description: 'Partnership inquiries' },
  { label: '🐛 Bug Report', value: 'BUG_REPORT', description: 'Report a bug' },
  { label: '📦 Other', value: 'OTHER', description: 'Other inquiries' },
] as const;

export const SUBMISSION_STATUSES = {
  PENDING: '🟡 Pending',
  APPROVED: '✅ Approved',
  REJECTED: '❌ Rejected',
  DELETED: '🗑️ Deleted',
  FLAGGED: '🚩 Flagged',
} as const;

export const PLATFORM_EMOJIS = {
  INSTAGRAM_REELS: '📸',
  TIKTOK: '🎵',
  YOUTUBE_SHORTS: '▶️',
  FACEBOOK_REELS: '📘',
  X_VIDEOS: '𝕏',
  THREADS: '🧵',
} as const;

export const LOG_CHANNELS = {
  VERIFICATION: 'verification-logs',
  TICKET: 'ticket-logs',
  SUBMISSION: 'submission-logs',
  DUPLICATE: 'duplicate-links',
  MODERATION: 'moderation-logs',
  CAMPAIGN: 'campaign-logs',
  ERROR: 'error-logs',
  STAFF: 'staff-actions',
} as const;

export const LEADERBOARD_PAGE_SIZE = 10;
export const MAX_AUTOCOMPLETE_RESULTS = 25;
export const TRANSCRIPT_DELETE_DELAY_MS = 5000;
