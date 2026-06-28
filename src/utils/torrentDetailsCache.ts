/**
 * TORRENT DETAILS CACHING SYSTEM
 *
 * This caching system provides:
 * - 30-minute cache expiry for all torrent details
 * - Automatic cache cleanup to prevent memory leaks
 * - Development tools for cache management (window.torrentCache)
 * - Cache hit/miss logging for debugging
 * - Per-torrent cache invalidation via retry button
 *
 * Cache Key Format: "{source}:{url}"
 * Cache Size: Estimated memory usage tracking
 * Dev Tools: Available at window.torrentCache in development mode
 */

// Cache interface for torrent details
export interface CachedTorrentDetails {
  description: string;
  files: { name: string; size: string }[];
  comments: { author: string; comment: string; date: string }[];
  images: { originalUrl: string; directUrl: string }[];
  error?: string;
  timestamp: number;
}

// Cache implementation with expiry
export class TorrentDetailsCache {
  private cache = new Map<string, CachedTorrentDetails>();
  private readonly CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  private getCacheKey(source: string, url: string): string {
    return `${source.toLowerCase()}:${url}`;
  }

  get(source: string, url: string): CachedTorrentDetails | null {
    const key = this.getCacheKey(source, url);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if cache entry has expired
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  set(
    source: string,
    url: string,
    details: Omit<CachedTorrentDetails, 'timestamp'>
  ): void {
    const key = this.getCacheKey(source, url);
    this.cache.set(key, {
      ...details,
      timestamp: Date.now(),
    });
  }

  delete(source: string, url: string): boolean {
    const key = this.getCacheKey(source, url);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats for debugging
  getStats(): { size: number; keys: string[]; totalSizeEstimate: string } {
    // Clean up expired entries first
    this.cleanExpired();

    const keys = Array.from(this.cache.keys());
    const totalSizeEstimate = this.estimateCacheSize();

    return {
      size: this.cache.size,
      keys,
      totalSizeEstimate,
    };
  }

  // Clean up expired entries
  private cleanExpired(): number {
    const now = Date.now();
    let cleanedCount = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.CACHE_EXPIRY_MS) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {

    }

    return cleanedCount;
  }

  // Estimate cache size (rough calculation)
  private estimateCacheSize(): string {
    let totalSize = 0;

    const values = Array.from(this.cache.values());
    for (const entry of values) {
      // Rough size estimation
      totalSize += JSON.stringify(entry).length * 2; // Rough UTF-16 byte estimate
    }

    if (totalSize < 1024) return `${totalSize} B`;
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`;
    return `${(totalSize / 1024 / 1024).toFixed(1)} MB`;
  }
}

// Global cache instance
export const torrentDetailsCache = new TorrentDetailsCache();

// Expose cache management in development mode
if (process.env.NODE_ENV === 'development') {
  (window as any).torrentCache = {
    getStats: () => {
      const stats = torrentDetailsCache.getStats();
      console.table({
        'Cache Size': stats.size,
        'Memory Usage': stats.totalSizeEstimate,
        'Active Keys': stats.keys.length,
      });
      return stats;
    },
    clear: () => {
      torrentDetailsCache.clear();

    },
    get: (source: string, url: string) => torrentDetailsCache.get(source, url),
    delete: (source: string, url: string) => {
      const deleted = torrentDetailsCache.delete(source, url);

      return deleted;
    },
  };

}
