import { ColorResolvable, resolveColor } from 'discord.js';

export const COLORS = {
  PRIMARY: '#6C5CE7' as ColorResolvable,
  SUCCESS: '#00B894' as ColorResolvable,
  ERROR: '#D63031' as ColorResolvable,
  WARNING: '#FDCB6E' as ColorResolvable,
  INFO: '#74B9FF' as ColorResolvable,
  MODERATION: '#E17055' as ColorResolvable,
  VERIFICATION: '#A29BFE' as ColorResolvable,
  SUBMISSION: '#00CEC9' as ColorResolvable,
  CAMPAIGN: '#6C5CE7' as ColorResolvable,
  TICKET: '#FD79A8' as ColorResolvable,
  XP: '#FFEAA7' as ColorResolvable,
  LEADERBOARD: '#DFE6E9' as ColorResolvable,
  PAYOUT: '#55EFC4' as ColorResolvable,

  // Lowercase keys support
  primary: '#6C5CE7' as ColorResolvable,
  success: '#00B894' as ColorResolvable,
  error: '#D63031' as ColorResolvable,
  warning: '#FDCB6E' as ColorResolvable,
  info: '#74B9FF' as ColorResolvable,
  moderation: '#E17055' as ColorResolvable,
  verification: '#A29BFE' as ColorResolvable,
  submission: '#00CEC9' as ColorResolvable,
  campaign: '#6C5CE7' as ColorResolvable,
  ticket: '#FD79A8' as ColorResolvable,
  xp: '#FFEAA7' as ColorResolvable,
  leaderboard: '#DFE6E9' as ColorResolvable,
  payout: '#55EFC4' as ColorResolvable,

  // Capitalized keys support
  Primary: '#6C5CE7' as ColorResolvable,
  Success: '#00B894' as ColorResolvable,
  Error: '#D63031' as ColorResolvable,
  Warning: '#FDCB6E' as ColorResolvable,
  Info: '#74B9FF' as ColorResolvable,
  Moderation: '#E17055' as ColorResolvable,
  Verification: '#A29BFE' as ColorResolvable,
  Submission: '#00CEC9' as ColorResolvable,
  Campaign: '#6C5CE7' as ColorResolvable,
  Ticket: '#FD79A8' as ColorResolvable,
  Xp: '#FFEAA7' as ColorResolvable,
  Leaderboard: '#DFE6E9' as ColorResolvable,
  Payout: '#55EFC4' as ColorResolvable,
};

export function safeResolveColor(color: any): ColorResolvable {
  if (!color) return COLORS.PRIMARY;

  // If it's already a number or array (valid ColorResolvable formats), return it
  if (typeof color === 'number' || Array.isArray(color)) {
    return color as ColorResolvable;
  }

  if (typeof color !== 'string') {
    return COLORS.PRIMARY;
  }

  const trimmed = color.trim();
  if (trimmed === '') return COLORS.PRIMARY;

  // 1. Check if it's a named config color in our COLORS object (case-insensitive)
  const normalized = trimmed.toLowerCase();
  const mapped = (COLORS as any)[normalized];
  if (mapped) return mapped;

  // 2. If it's a hex code without #, add #
  let resolved = trimmed;
  if (/^[0-9a-fA-F]{6}$/.test(resolved) || /^[0-9a-fA-F]{3}$/.test(resolved)) {
    resolved = `#${resolved}`;
  }

  // 3. Try to resolve via discord.js resolveColor (supporting Titlecase names like 'Red')
  try {
    const titleCased = resolved.charAt(0).toUpperCase() + resolved.slice(1).toLowerCase();
    resolveColor(titleCased as any);
    return titleCased as ColorResolvable;
  } catch {
    try {
      resolveColor(resolved as any);
      return resolved as ColorResolvable;
    } catch {
      return COLORS.PRIMARY;
    }
  }
}

export const colors = COLORS;
export const Colors = COLORS;
export default COLORS;
