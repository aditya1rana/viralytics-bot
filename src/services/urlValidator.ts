import { Platform } from '@prisma/client';

interface UrlValidationResult {
  valid: boolean;
  platform?: Platform;
  normalizedUrl?: string;
  error?: string;
}

interface PlatformConfig {
  platform: Platform;
  hostnames: string[];
  pathPattern: RegExp;
  normalizeUrl: (url: URL, pathMatch: RegExpMatchArray) => string;
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    platform: 'INSTAGRAM_REELS',
    hostnames: ['instagram.com', 'www.instagram.com'],
    pathPattern: /^\/(reel|reels)\/([A-Za-z0-9_-]+)/,
    normalizeUrl: (_url, match) => `https://www.instagram.com/reel/${match[2]}`,
  },
  {
    platform: 'TIKTOK',
    hostnames: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'm.tiktok.com'],
    pathPattern: /\/@[^/]+\/video\/(\d+)|\/v\/(\d+)/,
    normalizeUrl: (url, match) => {
      const videoId = match[1] || match[2];
      if (videoId) return `https://www.tiktok.com/video/${videoId}`;
      return `https://www.tiktok.com${url.pathname}`;
    },
  },
  {
    platform: 'YOUTUBE_SHORTS',
    hostnames: ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'],
    pathPattern: /\/shorts\/([A-Za-z0-9_-]+)/,
    normalizeUrl: (_url, match) => `https://www.youtube.com/shorts/${match[1]}`,
  },
  {
    platform: 'FACEBOOK_REELS',
    hostnames: ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com', 'm.facebook.com', 'fb.watch'],
    pathPattern: /\/(reel|reels|watch)\/(\d+)|\/reel\/([A-Za-z0-9_-]+)/,
    normalizeUrl: (_url, match) => {
      const id = match[2] || match[3];
      return `https://www.facebook.com/reel/${id}`;
    },
  },
  {
    platform: 'X_VIDEOS',
    hostnames: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'],
    pathPattern: /\/([A-Za-z0-9_]+)\/status\/(\d+)/,
    normalizeUrl: (_url, match) => `https://x.com/${match[1]}/status/${match[2]}`,
  },
  {
    platform: 'THREADS',
    hostnames: ['threads.net', 'www.threads.net'],
    pathPattern: /\/@([^/]+)\/post\/([A-Za-z0-9_-]+)/,
    normalizeUrl: (_url, match) => `https://www.threads.net/@${match[1]}/post/${match[2]}`,
  },
];

/**
 * Validate and normalize a social media URL.
 * Returns the detected platform and a canonical normalized URL.
 */
export function validateAndNormalizeUrl(input: string): UrlValidationResult {
  let urlStr = input.trim();

  // Add protocol if missing
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = `https://${urlStr}`;
  }

  // Parse URL
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  // Strip www for hostname matching
  const hostname = url.hostname.replace(/^www\./, '');
  const fullHostname = url.hostname;

  // Try each platform
  for (const config of PLATFORM_CONFIGS) {
    const hostMatch = config.hostnames.some(h => {
      const normalized = h.replace(/^www\./, '');
      return hostname === normalized || fullHostname === h;
    });

    if (!hostMatch) continue;

    const pathMatch = url.pathname.match(config.pathPattern);
    if (!pathMatch) {
      return {
        valid: false,
        error: `URL looks like a ${config.platform.replace(/_/g, ' ').toLowerCase()} link, but the format is not recognized. Please submit a direct link to the video/reel.`,
      };
    }

    const normalizedUrl = config.normalizeUrl(url, pathMatch);

    return {
      valid: true,
      platform: config.platform,
      normalizedUrl,
    };
  }

  return {
    valid: false,
    error: 'Unsupported platform. Supported: Instagram Reels, TikTok, YouTube Shorts, Facebook Reels, X Videos, Threads.',
  };
}

/**
 * Get a human-readable platform name from the enum.
 */
export function getPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    INSTAGRAM_REELS: '📸 Instagram Reels',
    TIKTOK: '🎵 TikTok',
    YOUTUBE_SHORTS: '▶️ YouTube Shorts',
    FACEBOOK_REELS: '📘 Facebook Reels',
    X_VIDEOS: '𝕏 X Video',
    THREADS: '🧵 Threads',
  };
  return names[platform] || platform;
}
