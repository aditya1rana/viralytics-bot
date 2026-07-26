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
    let handle = this.extractHandleFromUrl(url);
    let videoId: string | null = null;
    let viewsCount = 0;
    let likesCount = 0;
    let thumbnailUrl: string | null = null;

    // Extract video ID from shorts URL or regular watch URL
    const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) videoId = shortsMatch[1];
    if (!videoId) {
      const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (watchMatch) videoId = watchMatch[1];
    }

    // Build a standard watch URL for oEmbed/HTML fetching
    const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;

    // 1. YouTube oEmbed for title, author, thumbnail
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data: any = await res.json();
        if (data.author_name) handle = data.author_name;
        if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
      }
    } catch {
      // Keep defaults
    }

    // 2. Fetch the HTML page to scrape view/like counts and fallback author
    try {
      const res = await fetch(watchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (res.ok) {
        const html = await res.text();

        // Views — multiple patterns YouTube uses in page data
        const viewPatterns = [
          /"viewCount":"(\d+)"/,
          /"views":{"simpleText":"([\d,]+)\s/,
          /(\d[\d,.]*)\s+views/i,
          /"short_view_count_text":{"simpleText":"([\d.]+[KMB]?)\s/,
        ];
        for (const pattern of viewPatterns) {
          const m = html.match(pattern);
          if (m) {
            let raw = m[1].replace(/,/g, "");
            // Handle K/M/B suffixes
            if (/K$/i.test(raw)) { viewsCount = Math.round(parseFloat(raw) * 1000); }
            else if (/M$/i.test(raw)) { viewsCount = Math.round(parseFloat(raw) * 1_000_000); }
            else if (/B$/i.test(raw)) { viewsCount = Math.round(parseFloat(raw) * 1_000_000_000); }
            else { viewsCount = parseInt(raw, 10) || 0; }
            if (viewsCount > 0) break;
          }
        }

        // Likes
        const likeMatch = html.match(/"label":"([\d,]+) likes"/) ||
                          html.match(/"likeCount":"?(\d+)"?/) ||
                          html.match(/"accessibilityText":"([\d,]+) likes"/);
        if (likeMatch) {
          likesCount = parseInt(likeMatch[1].replace(/,/g, ""), 10) || 0;
        }

        // Author fallback
        if (!handle || handle === 'yt_creator') {
          const channelMatch = html.match(/"channelName":"([^"]+)"/) || html.match(/"author":"([^"]+)"/);
          if (channelMatch) handle = channelMatch[1];
        }
      }
    } catch {
      // Keep defaults
    }

    // Fallback thumbnail from YouTube CDN
    if (!thumbnailUrl && videoId) {
      thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return {
      platform: 'YOUTUBE_SHORTS',
      viewsCount,
      likesCount,
      thumbnailUrl,
      creatorHandle: handle || 'yt_creator',
      originalUrl: url,
    };
  },

  async fetchTikTokMetadata(url: string): Promise<SocialMetadata> {
    let handle = this.extractHandleFromUrl(url);
    let videoId = "";
    const match = url.match(/\/video\/(\d+)/) || url.match(/\/v\/(\d+)/);
    if (match) videoId = match[1];

    let thumbnailUrl: string | null = null;
    let viewsCount = 0;
    let likesCount = 0;

    // 1. TikTok oEmbed for Author & Thumbnail
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data: any = await res.json();
        if (data.author_unique_id) handle = data.author_unique_id;
        else if (data.author_name) handle = data.author_name;
        if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
      }
    } catch {
      // Keep defaults
    }

    // 2. Fetch TikTok Embed HTML (https://www.tiktok.com/embed/v2/{videoId}) to scrape view & like counts
    try {
      const targetUrl = videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : url;
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (res.ok) {
        const html = await res.text();

        // Parse play count / views
        const playCountMatch = html.match(/"playCount":\s*(\d+)/) ||
                               html.match(/"viewsCount":\s*(\d+)/) ||
                               html.match(/"play_count":\s*(\d+)/) ||
                               html.match(/(\d[\d,.]*)\s+views/i) ||
                               html.match(/(\d[\d,.]*)\s+plays/i);
        if (playCountMatch) {
          viewsCount = parseInt(playCountMatch[1].replace(/,/g, ""), 10) || 0;
        }

        // Parse likes
        const diggCountMatch = html.match(/"diggCount":\s*(\d+)/) ||
                               html.match(/"likesCount":\s*(\d+)/) ||
                               html.match(/"like_count":\s*(\d+)/);
        if (diggCountMatch) {
          likesCount = parseInt(diggCountMatch[1].replace(/,/g, ""), 10) || 0;
        }

        // Author fallback
        if (!handle || handle === "tiktok_creator") {
          const userMatch = html.match(/"uniqueId":"([^"]+)"/) || html.match(/@([a-zA-Z0-9_.-]+)/);
          if (userMatch) handle = userMatch[1];
        }

        // Thumbnail fallback
        if (!thumbnailUrl) {
          const thumbMatch = html.match(/"cover":"([^"]+)"/) || html.match(/"originCover":"([^"]+)"/);
          if (thumbMatch) thumbnailUrl = thumbMatch[1].replace(/\\u0026/g, "&");
        }
      }
    } catch (err) {
      logger.error(`Error fetching TikTok embed for ${url}:`, err);
    }

    return {
      platform: 'TIKTOK',
      viewsCount,
      likesCount,
      thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400&q=80',
      creatorHandle: handle || 'tiktok_creator',
      originalUrl: url,
    };
  },

  async fetchInstagramMetadata(url: string): Promise<SocialMetadata> {
    let handle = this.extractHandleFromUrl(url);
    let viewsCount = 0;
    let likesCount = 0;
    let thumbnailUrl: string | null = null;

    let shortcode = "";
    const parts = url.split("/");
    const idx = parts.findIndex(p => p === "reel" || p === "p" || p === "reels");
    if (idx !== -1 && parts[idx + 1]) {
      shortcode = parts[idx + 1].split("?")[0].split("&")[0];
    }
    if (idx > 3 && parts[idx - 1] && parts[idx - 1] !== "www.instagram.com" && parts[idx - 1] !== "instagram.com") {
      handle = parts[idx - 1].replace("@", "");
    }

    if (shortcode) {
      const apifyToken = String(process.env.APIFY_TOKEN || "").trim();
      let apifySuccess = false;

      if (apifyToken) {
        const reelUrl = `https://www.instagram.com/reel/${shortcode}/`;
        const actorsToTry = ["apify~instagram-reel-scraper", "apify~instagram-scraper"];
        for (const actor of actorsToTry) {
          if (apifySuccess) break;
          try {
            const apifyUrl = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${apifyToken}`;
            const res = await fetch(apifyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ directUrls: [reelUrl], username: [reelUrl], urls: [reelUrl], resultsLimit: 1 })
            });
            if (res.ok) {
              const items = await res.json();
              const item = items?.[0];
              if (item) {
                handle = item.ownerUsername || item.username || handle;
                thumbnailUrl = item.displayUrl || item.thumbnailUrl || thumbnailUrl;
                viewsCount = Number(item.videoPlayCount || item.videoViewCount || item.playsCount || item.playCount || item.viewCount || 0);
                likesCount = Number(item.likesCount || item.likeCount || 0);
                // Only use real views from Apify
                apifySuccess = true;
              }
            }
          } catch (e) {
            logger.error(`Apify call failed for ${actor}:`, e);
          }
        }
      }

      if (!apifySuccess) {
        try {
          const res = await fetch(`https://www.instagram.com/reel/${shortcode}/`, {
            headers: {
              "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
              "Accept-Language": "en-US,en;q=0.9",
            },
          });
          if (res.ok) {
            const html = await res.text();
            const parseAbbrev = (str: string) => {
              if (!str) return 0;
              const clean = str.trim().toUpperCase();
              let n = parseFloat(clean.replace(/,/g, ""));
              if (isNaN(n)) return 0;
              if (clean.endsWith("K")) n *= 1000;
              if (clean.endsWith("M")) n *= 1000000;
              if (clean.endsWith("B")) n *= 1000000000;
              return Math.round(n);
            };

            const ogDescMatch = html.match(/property="og:description"\s+content="([^"]+)"/i) ||
                                html.match(/name="description"\s+content="([^"]+)"/i);
            if (ogDescMatch) {
              const desc = ogDescMatch[1];
              const likesMatch = desc.match(/([\d,.]+[KMB]?)\s+likes/i);
              if (likesMatch) likesCount = parseAbbrev(likesMatch[1]);

              const userMatch = desc.match(/-\s*([a-zA-Z0-9_.-]+)\s+on/i) || desc.match(/@([a-zA-Z0-9_.-]+)/i);
              if (userMatch && userMatch[1] !== "instagram") handle = userMatch[1].trim();
            }

            const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
            if (ogImageMatch) thumbnailUrl = ogImageMatch[1].replace(/&amp;/g, "&");

            const viewsMatch = html.match(/"video_play_count":\s*(\d+)/i) ||
                               html.match(/"video_view_count":\s*(\d+)/i) ||
                               html.match(/"play_count":\s*(\d+)/i) ||
                               html.match(/"view_count":\s*(\d+)/i) ||
                               html.match(/([\d,.]+[KMB]?)\s+views/i) ||
                               html.match(/([\d,.]+[KMB]?)\s+plays/i);
            if (viewsMatch) {
              viewsCount = parseAbbrev(viewsMatch[1]);
            }

            // Real views only
          }
        } catch (err) {
          logger.error(`Error fetching IG metadata for ${shortcode}:`, err);
        }
      }
    }

    return {
      platform: 'INSTAGRAM_REELS',
      viewsCount,
      likesCount,
      thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=400&q=80',
      creatorHandle: handle || 'instagram_creator',
      originalUrl: url,
    };
  }
};
