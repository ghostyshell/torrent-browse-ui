import { sqliteCacheAPI } from '../services/tursoStorageAPI';

/**
 * STREAM URL CACHING SYSTEM - SQLite Backend Implementation
 *
 * This caching system provides:
 * - Permanent persistent caching using SQLite backend (no page refresh loss)
 * - Hybrid caching: localStorage for immediate access + SQLite for persistence
 * - Development tools for cache management (window.streamUrlCache)
 * - Cache hit/miss logging for debugging
 * - Per-magnet cache invalidation
 * - Automatic cleanup managed by SQLite backend
 *
 * Cache Key Format: "{magnetHash}"
 * Cache contains: streamUrl, filename, filesize, supportsRangeRequests
 * Dev Tools: Available at window.streamUrlCache in development mode
 */

// Cache interface for stream URLs
export interface CachedStreamUrl {
  streamUrl: string;
  filename: string;
  filesize: number;
  supportsRangeRequests?: boolean;
  magnetLink: string; // Store original magnet for reference
  timestamp: number;
}

// Enhanced cache implementation with SQLite backend + localStorage hybrid
export class StreamUrlCache {
  private localCache = new Map<string, CachedStreamUrl>();
  private readonly STORAGE_KEY = 'torrent-stream-urls-local';

  constructor() {
    this.loadFromLocalStorage();

  }

  private getMagnetHash(magnetLink: string): string {
    // Extract the hash from magnet link
    // magnet:?xt=urn:btih:HASH&...
    const match = magnetLink.match(/xt=urn:btih:([a-fA-F0-9]{40})/);
    if (match) {
      return match[1].toLowerCase();
    }

    // Fallback: use base64 encoded normalized magnet (match backend implementation)
    // Using TextEncoder to match Node.js Buffer.from() behavior more closely
    const encoder = new TextEncoder();
    const data = encoder.encode(magnetLink);
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(data)));
    return base64
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 40);
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, entry] of Object.entries(data)) {
          this.localCache.set(key, entry as CachedStreamUrl);
        }

      }
    } catch (error) {
      console.warn('Error loading stream URL cache from localStorage:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private saveToLocalStorage(): void {
    try {
      const data: Record<string, CachedStreamUrl> = {};
      Array.from(this.localCache.entries()).forEach(([key, entry]) => {
        data[key] = entry;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving stream URL cache to localStorage:', error);
      // Clear some old entries if quota exceeded
      if (this.localCache.size > 5) {
        this.cleanupLocalCache();
        this.saveToLocalStorage(); // Retry after cleanup
      }
    }
  }

  private cleanupLocalCache(): void {
    // No size limit - allow unlimited local caching
    return;
  }

  async get(magnetLink: string, skipCache: boolean = false): Promise<CachedStreamUrl | null> {
    const key = this.getMagnetHash(magnetLink);

    // If skipCache is true, don't check any cache - used for force refresh
    if (skipCache) {

      return null;
    }

    // ALWAYS prioritize SQLite backend over localStorage
    // SQLite is the authoritative source that gets updated by background jobs
    // localStorage is only used as a fallback when backend is unavailable
    let backendData = null;

    try {
      backendData = await sqliteCacheAPI.getStreamUrl(magnetLink);

      if (backendData) {

        const cacheEntry: CachedStreamUrl = {
          streamUrl: backendData.streamUrl,
          filename: backendData.filename || 'Unknown',
          filesize: backendData.filesize || 0,
          supportsRangeRequests: backendData.supportsRangeRequests,
          magnetLink,
          timestamp: backendData.cachedAt || Date.now(),
        };

        // Update local cache with backend data for offline access
        this.localCache.set(key, cacheEntry);
        this.cleanupLocalCache();
        this.saveToLocalStorage();

        return cacheEntry;
      }
    } catch (error) {
      console.warn(`⚠️ Error checking SQLite backend for stream URL ${key}:`, error);
      if (error instanceof Error) {
        if (error.message.includes('Network Error') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          console.warn('🔌 Backend appears to be offline - falling back to localStorage');
        }
      }
    }

    // Fallback to localStorage only if SQLite backend has no data or is unavailable
    const localCached = this.localCache.get(key);
    if (localCached) {

      return localCached;
    }

    return null;
  }

  async set(
    magnetLink: string,
    streamData: {
      streamUrl: string;
      filename: string;
      filesize: number;
      supportsRangeRequests?: boolean;
    }
  ): Promise<void> {
    const key = this.getMagnetHash(magnetLink);

    const cacheEntry: CachedStreamUrl = {
      ...streamData,
      magnetLink,
      timestamp: Date.now(),
    };

    // Store in local cache for immediate access
    this.localCache.set(key, cacheEntry);
    this.cleanupLocalCache();
    this.saveToLocalStorage();

    // Store in SQLite backend for permanent persistence
    try {

      
      const backendSuccess = await sqliteCacheAPI.setStreamUrl(magnetLink, {
        streamUrl: streamData.streamUrl,
        filename: streamData.filename,
        filesize: streamData.filesize,
        supportsRangeRequests: streamData.supportsRangeRequests,
        torrentName: streamData.filename, // Use filename as torrent name for now
      });
      
      if (backendSuccess) {

        
        // Verify it was stored correctly by trying to retrieve it
        try {
          const verification = await sqliteCacheAPI.getStreamUrl(magnetLink);
          if (verification) {

          } else {
            console.warn(`🔍 ❌ Backend verification failed for: ${streamData.filename}`);
          }
        } catch (verifyError) {
          console.warn(`🔍 ⚠️ Backend verification error:`, verifyError);
        }
      } else {
        console.warn(
          `💾 ❌ Failed to cache stream URL in SQLite backend for magnet: ${key} -> ${streamData.filename}`
        );
      }
    } catch (error) {
      console.error(`💾 ⚠️ Error caching stream URL in SQLite backend for magnet: ${key}:`, error);
      // Still have local cache as fallback
    }

  }

  async delete(magnetLink: string): Promise<boolean> {
    const key = this.getMagnetHash(magnetLink);

    // Remove from local cache
    const localDeleted = this.localCache.delete(key);
    if (localDeleted) {
      this.saveToLocalStorage();

    }

    // Note: We don't delete from SQLite backend as it serves as permanent storage
    // The backend has its own cleanup policies

    return localDeleted;
  }

  async forceDelete(magnetLink: string): Promise<boolean> {
    const key = this.getMagnetHash(magnetLink);

    // Remove from local cache
    const localDeleted = this.localCache.delete(key);
    if (localDeleted) {
      this.saveToLocalStorage();

    }

    // For force delete, also delete from SQLite backend
    // This is critical for force refresh scenarios
    let backendDeleted = false;
    try {

      backendDeleted = await sqliteCacheAPI.deleteStreamUrl(magnetLink);
      if (backendDeleted) {

      } else {
        console.warn(
          `⚠️ Failed to delete stream URL from SQLite backend for magnet: ${key}`
        );
      }
    } catch (error) {
      console.error('Error deleting stream URL from backend:', error);
    }

    return localDeleted || backendDeleted;
  }

  async has(magnetLink: string): Promise<boolean> {
    const key = this.getMagnetHash(magnetLink);

    // Check local cache first
    if (this.localCache.has(key)) {
      return true;
    }

    // Check SQLite backend
    try {
      const backendData = await sqliteCacheAPI.getStreamUrl(magnetLink);
      return !!backendData;
    } catch (error) {
      console.warn('Error checking SQLite backend for stream URL:', error);
      return false;
    }
  }

  // Synchronous version for immediate UI updates
  hasLocal(magnetLink: string): boolean {
    const key = this.getMagnetHash(magnetLink);
    return this.localCache.has(key);
  }

  async clear(): Promise<void> {

    this.localCache.clear();
    localStorage.removeItem(this.STORAGE_KEY);

    // Note: We don't clear SQLite backend as it serves as permanent storage

  }

  // Get cache stats for debugging
  async getStats(): Promise<{
    localSize: number;
    localKeys: string[];
    localEntries: CachedStreamUrl[];
    totalSizeEstimate: string;
    backendStats?: any;
  }> {
    this.cleanupLocalCache();

    const localKeys = Array.from(this.localCache.keys());
    const localEntries = Array.from(this.localCache.values());
    const totalSizeEstimate = this.estimateCacheSize();

    let backendStats;
    try {
      backendStats = await sqliteCacheAPI.getStats();
    } catch (error) {
      console.warn('Error getting backend stats:', error);
    }

    return {
      localSize: this.localCache.size,
      localKeys,
      localEntries,
      totalSizeEstimate,
      backendStats,
    };
  }

  // Estimate cache size (rough calculation)
  private estimateCacheSize(): string {
    let totalSize = 0;

    const values = Array.from(this.localCache.values());
    for (const entry of values) {
      // Rough size estimation - URLs are typically small but include them
      totalSize += JSON.stringify(entry).length * 2; // Rough UTF-16 byte estimate
    }

    if (totalSize < 1024) return `${totalSize} B`;
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`;
    return `${(totalSize / 1024 / 1024).toFixed(1)} MB`;
  }

  // Get all magnet links that have cached URLs (local only for performance)
  getCachedMagnetLinks(): string[] {
    this.cleanupLocalCache();
    return Array.from(this.localCache.values()).map(
      (entry) => entry.magnetLink
    );
  }

  /**
   * Batch load stream URLs from backend for multiple magnet links
   * This is useful for preloading stream URLs when localStorage is missing
   */
  async batchLoadFromBackend(magnetLinks: string[]): Promise<{
    loaded: number;
    total: number;
    failed: string[];
  }> {
    const results = {
      loaded: 0,
      total: magnetLinks.length,
      failed: [] as string[],
    };

    if (magnetLinks.length === 0) {
      return results;
    }

    // Process in larger batches for better performance (increased from 5 to 10)
    const batchSize = 10;
    for (let i = 0; i < magnetLinks.length; i += batchSize) {
      const batch = magnetLinks.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (magnetLink) => {
          try {
            const key = this.getMagnetHash(magnetLink);

            // Always load from SQLite backend (authoritative source)
            const backendData = await sqliteCacheAPI.getStreamUrl(magnetLink);
            if (backendData) {
              const cacheEntry: CachedStreamUrl = {
                streamUrl: backendData.streamUrl,
                filename: backendData.filename || 'Unknown',
                filesize: backendData.filesize || 0,
                supportsRangeRequests: backendData.supportsRangeRequests,
                magnetLink,
                timestamp: backendData.cachedAt || Date.now(),
              };

              this.localCache.set(key, cacheEntry);
              results.loaded++;
            } else {
              // No backend data - check if we have localStorage fallback
              const localCached = this.localCache.get(key);
              if (localCached) {
                // Have local cache as fallback, count as loaded
                results.loaded++;
              } else {
                // No data anywhere
                results.failed.push(magnetLink);
              }
            }
          } catch (error) {
            console.warn(`⚠️ [StreamCache] Failed to preload stream URL for magnet:`, error);
            // On backend error, check if we have localStorage fallback
            const key = this.getMagnetHash(magnetLink);
            const localCached = this.localCache.get(key);
            if (localCached) {
              results.loaded++;
            } else {
              results.failed.push(magnetLink);
            }
          }
        })
      );

      // Reduced delay between batches for faster loading (100ms -> 50ms)
      if (i + batchSize < magnetLinks.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Save updated local cache to localStorage
    this.saveToLocalStorage();

    return results;
  }
}

// Global cache instance
export const streamUrlCache = new StreamUrlCache();

// Expose cache management in development mode
if (process.env.NODE_ENV === 'development') {
  (window as any).streamUrlCache = {
    getStats: async () => {
      const stats = await streamUrlCache.getStats();
      console.table({
        'Local Cache Size': stats.localSize,
        'Memory Usage': stats.totalSizeEstimate,
        'Active Local URLs': stats.localKeys.length,
        'Max Local Allowed': 20, // Show the local size limit
        'Cache Type': 'Hybrid (localStorage + SQLite)',
        'Backend Available': !!stats.backendStats,
      });
      if (stats.backendStats) {

      }
      return stats;
    },
    clear: async () => {
      await streamUrlCache.clear();

    },
    get: async (magnetLink: string) => await streamUrlCache.get(magnetLink),
    has: async (magnetLink: string) => await streamUrlCache.has(magnetLink),
    hasLocal: (magnetLink: string) => streamUrlCache.hasLocal(magnetLink),
    delete: async (magnetLink: string) => {
      const deleted = await streamUrlCache.delete(magnetLink);

      return deleted;
    },
    forceDelete: async (magnetLink: string) => {
      const deleted = await streamUrlCache.forceDelete(magnetLink);

      return deleted;
    },
    getCachedMagnetLinks: () => streamUrlCache.getCachedMagnetLinks(),
    batchLoadFromBackend: (magnetLinks: string[]) => streamUrlCache.batchLoadFromBackend(magnetLinks),
  };

}
