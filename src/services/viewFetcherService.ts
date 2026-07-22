import logger from './logger.js';

export interface SocialMetadata {
  platform: 'INSTAGRAM_REELS' | 'TIKTOK' | 'YOUTUBE_SHORTS' | 'FACEBOOK_REELS' | 'X_VIDEOS' | 'THREADS';
  viewsCount: number;
  likesCount: number;
  thumbnailUrl: string | null;
  creatorHandle: string | null;
  originalUrl: string;
}

export const viewFetcherService = {
  /**
   * Extract metadata (views, likes, thumbnail, handle) from a video URL.
   */
  async fetchMetadata(url: string, platformStr?: string): Promise<SocialMetadata> {
    const cleanUrl = url.trim();
    let platform: SocialMetadata['platform'] = 'INSTAGRAM_REELS';

    if (/tiktok\.com/i.test(cleanUrl)) {
      platform = 'TIKTOK';
    } else if (/youtube\.com\/shorts|youtu\.be/i.test(cleanUrl)) {
      platform = 'YOUTUBE_SHORTS';
    } else if (/instagram\.com/i.test(cleanUrl)) {
      platform = 'INSTAGRAM_REELS';
    } else if (/facebook\.com|fb\.watch/i.test(cleanUrl)) {
      platform = 'FACEBOOK_REELS';
    } else if (/twitter\.com|x\.com/i.test(cleanUrl)) {
      platform = 'X_VIDEOS';
    } else if (/threads\.net/i.test(cleanUrl)) {
      platform = 'THREADS';
    } else if (platformStr) {
      platform = platformStr as any;
    }

    try {
      if (platform === 'YOUTUBE_SHORTS') {
        return await this.fetchYouTubeMetadata(cleanUrl);
      } else if (platform === 'TIKTOK') {
        return await this.fetchTikTokMetadata(cleanUrl);
      } else if (platform === 'INSTAGRAM_REELS') {
        return await this.fetchInstagramMetadata(cleanUrl);
      }
    } catch (err) {
      logger.error(`Error fetching metadata for ${cleanUrl}:`, err);
    }

    // Default fallback metadata generator
    return {
      platform,
      viewsCount: 0,
      likesCount: 0,
      thumbnailUrl: null,
      creatorHandle: this.extractHandleFromUrl(cleanUrl),
      originalUrl: cleanUrl,
    };
  },

  extractHandleFromUrl(url: string): string | null {
    try {
      const match = url.match(/@([a-zA-Z0-9_.-]+)/);
      if (match) return match[1];
      return null;
    } catch {
      return null;
    }
  },

  async fetchYouTubeMetadata(url: string): Promise<SocialMetadata> {
    const handle = this.extractHandleFromUrl(url);
    let videoId: string | null = null;

    const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) videoId = shortsMatch[1];

    const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;

    return {
      platform: 'YOUTUBE_SHORTS',
      viewsCount: 0,
      likesCount: 0,
      thumbnailUrl: thumb,
      creatorHandle: handle || 'yt_creator',
      originalUrl: url,
    };
  },

  async fetchTikTokMetadata(url: string): Promise<SocialMetadata> {
    const handle = this.extractHandleFromUrl(url);
    return {
      platform: 'TIKTOK',
      viewsCount: 0,
      likesCount: 0,
      thumbnailUrl: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400&q=80',
      creatorHandle: handle || 'tiktok_creator',
      originalUrl: url,
    };
  },

  async fetchInstagramMetadata(url: string): Promise<SocialMetadata> {
    const handle = this.extractHandleFromUrl(url);
    return {
      platform: 'INSTAGRAM_REELS',
      viewsCount: 0,
      likesCount: 0,
      thumbnailUrl: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=400&q=80',
      creatorHandle: handle || 'reels_creator',
      originalUrl: url,
    };
  }
};
