/**
 * Simple in-memory cache for API responses
 * For production, use Redis or a dedicated caching service
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiresAt < now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

export const cache = new Cache();

/**
 * Cache key generators
 */
export const cacheKeys = {
  channels: (channelId?: number) => `channels${channelId ? `:${channelId}` : ""}`,
  campaigns: (channelId: number, adAccountId: string) => `campaigns:${channelId}:${adAccountId}`,
  adSets: (channelId: number, adAccountId: string, campaignId?: string) =>
    `adsets:${channelId}:${adAccountId}${campaignId ? `:${campaignId}` : ""}`,
  ads: (channelId: number, adAccountId: string, adSetId?: string) =>
    `ads:${channelId}:${adAccountId}${adSetId ? `:${adSetId}` : ""}`,
  audiences: (channelId: number, adAccountId: string) => `audiences:${channelId}:${adAccountId}`,
  catalogs: (channelId: number, businessId: string) => `catalogs:${channelId}:${businessId}`,
  products: (catalogId: string) => `products:${catalogId}`,
  orders: (channelId: number) => `orders:${channelId}`,
  analytics: (channelId: number, daysBack: number) => `analytics:${channelId}:${daysBack}`,
  conversations: (channelId: number) => `conversations:${channelId}`,
};

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = 60000
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fn();
  cache.set(key, data, ttlMs);
  return data;
}

