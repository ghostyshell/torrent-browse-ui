import { Torrent } from '../types/Torrent';
import { getAuthHeaders } from './authSession';
import { backendUrl } from '../config/env';

/**
 * ENHANCED COVER IMAGE MANAGEMENT SERVICE - Backend-Only
 *
 * This service provides:
 * - Backend-only Turso database storage
 * - S3 object storage (handled by the backend) for stable image URLs
 * - No localStorage dependency
 * - Enhanced persistence across devices/sessions
 * - Development tools for debugging
 */

interface CoverImageData {
  imageUrl: string;
  originalUrl: string;
  timestamp: number;
  torrentName: string;
  fallbackUrls?: string[];
}

class EnhancedCoverImageService {
  private backendRequestCache = new Map<string, Promise<string | null>>();
  private inMemoryCache = new Map<string, CoverImageData>();

  constructor() {
    // No localStorage initialization needed
  }

  /**
   * Generate a unique key for a torrent based on its properties
   */
  private getTorrentKey(torrent: Torrent): string {
    // For cached links, use a more specific identifier
    if (torrent.isCachedLink && torrent.cachedLinkId) {
      const key = `cached_link_${torrent.cachedLinkId}`;
      return key;
    }

    // Use name, source, and size to create a unique identifier
    const identifier = `${torrent.Name}_${torrent.Source}_${torrent.Size}`;
    let key = identifier.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    // Limit key length to prevent URL issues (max 200 chars)
    if (key.length > 200) {
      // Keep first 150 chars and add hash of full string for uniqueness
      const hash = this.simpleHash(key);
      key = key.substring(0, 150) + '_' + hash;
    }

    return key;
  }

  /**
   * Simple hash function for creating shorter unique identifiers
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached cover from in-memory cache (session-only)
   */
  private getCachedCover(key: string): CoverImageData | null {
    return this.inMemoryCache.get(key) || null;
  }

  /**
   * Save cover to in-memory cache (session-only)
   */
  private cacheCover(key: string, data: CoverImageData): void {
    this.inMemoryCache.set(key, data);
  }

  /**
   * Set a cover image for a torrent (backend-only storage). The backend uploads
   * the image to S3 object storage and returns the stable URL.
   */
  async setCoverImage(
    torrent: Torrent,
    imageUrl: string,
    originalUrl: string
  ): Promise<void> {
    const key = this.getTorrentKey(torrent);

    console.debug(`🖼️ [Cover Image] Setting cover for "${torrent.Name}"...`);

    const finalImageUrl = imageUrl;
    const finalOriginalUrl = originalUrl;

    // NOTE: the in-memory cache is populated only AFTER the backend confirms the
    // store succeeded (see below). Caching here would mask a failed store as "set"
    // for the rest of the session, then the cover would vanish after refresh.

    // Enhance torrent object with favorite/cached link information before sending to backend
    let enhancedTorrent = { ...torrent };

    // If this is not already identified as a cached link, check if it should have a favoriteEntryId
    if (!enhancedTorrent.isCachedLink && !enhancedTorrent.favoriteEntryId) {
      try {
        // Import favoritesService dynamically to avoid circular imports
        const favoritesService = (await import('./favoritesService')).default;

        // Check if this torrent is a favorite and get its entry ID
        const favoriteEntry = await favoritesService.getFavoriteEntry(torrent);
        if (favoriteEntry && favoriteEntry.id) {
          enhancedTorrent.favoriteEntryId = favoriteEntry.id;
          console.debug(
            `💾 [Cover Image] Enhanced torrent with favoriteEntryId: ${favoriteEntry.id} for "${torrent.Name}"`
          );
        }
      } catch (error) {
        console.debug(
          `ℹ️ [Cover Image] Could not fetch favorite entry ID for "${torrent.Name}":`,
          error
        );
        // This is not necessarily an error - the torrent might not be a favorite
      }
    }

    // Store in backend (image URL only; the backend uploads it to S3)
    try {
      console.debug(`☁️ [Cover Image] Saving to backend...`);

      const response = await fetch(
        `${
          backendUrl
        }/api/cache/cover-image`,
        {
          method: 'POST',
          credentials: 'include',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            torrent: enhancedTorrent,
            imageUrl: finalImageUrl,
            originalUrl: finalOriginalUrl,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Cache in memory only now that the backend has confirmed persistence,
          // so a failed store can't make the cover look set for the rest of the session.
          this.cacheCover(key, {
            imageUrl: finalImageUrl,
            originalUrl: finalOriginalUrl,
            timestamp: Date.now(),
            torrentName: torrent.Name,
          });
          console.debug(
            `✅ [Cover Image] Successfully stored in backend for "${torrent.Name}"`
          );
        } else {
          console.warn(
            `❌ [Cover Image] Backend storage failed for "${torrent.Name}":`,
            result.error || 'Unknown error'
          );
          throw new Error(result.error || 'Backend storage failed');
        }
      } else {
        console.warn(
          `❌ [Cover Image] Backend storage failed for "${torrent.Name}":`,
          response.status,
          response.statusText
        );
        throw new Error(`Backend returned ${response.status}`);
      }
    } catch (error: any) {
      // Evict any stale entry so the failure isn't masked as "set" this session.
      this.inMemoryCache.delete(key);
      console.error(
        `❌ [Cover Image] Failed to store in backend for "${torrent.Name}":`,
        error.message || error
      );
      throw error; // Re-throw to let caller know it failed
    }
  }

  /**
   * Get cover image for a torrent (backend-only)
   */
  async getCoverImage(torrent: Torrent): Promise<string | null> {
    const key = this.getTorrentKey(torrent);

    // Check in-memory cache first for session performance
    const cachedCover = this.getCachedCover(key);
    if (cachedCover) {
      console.debug(
        `🎯 [Cover Image] Found in memory cache for "${torrent.Name}"`
      );
      return cachedCover.imageUrl;
    }

    // Check if there's already a pending request for this torrent
    if (this.backendRequestCache.has(key)) {
      console.debug(
        `⏳ [Cover Image] Waiting for pending request for "${torrent.Name}"`
      );
      return this.backendRequestCache.get(key)!;
    }

    // Create and cache the backend request promise
    const requestPromise = this.fetchFromBackend(torrent, key);
    this.backendRequestCache.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Remove from cache after completion
      this.backendRequestCache.delete(key);
    }
  }

  /**
   * Fetch cover image from backend
   */
  private async fetchFromBackend(
    torrent: Torrent,
    key: string
  ): Promise<string | null> {
    console.debug(`🌐 [Cover Image] Fetching from backend: "${torrent.Name}"`);

    try {
      // Enhance torrent object with favorite/cached link information before sending to backend
      let enhancedTorrent = { ...torrent };

      // If this torrent doesn't already have favoriteEntryId but might be a favorite, try to get it
      if (!enhancedTorrent.favoriteEntryId && !enhancedTorrent.isCachedLink) {
        try {
          // Import favoritesService dynamically to avoid circular imports
          const favoritesService = (await import('./favoritesService')).default;

          // Check if this torrent is a favorite and get its entry ID
          const favoriteEntry = await favoritesService.getFavoriteEntry(
            torrent
          );
          if (favoriteEntry && favoriteEntry.id) {
            enhancedTorrent.favoriteEntryId = favoriteEntry.id;
            console.debug(
              `🔍 [Cover Image] Enhanced torrent with favoriteEntryId: ${favoriteEntry.id} for backend fetch of "${torrent.Name}"`
            );
          }
        } catch (error) {
          console.debug(
            `ℹ️ [Cover Image] Could not enhance torrent with favoriteEntryId for "${torrent.Name}":`,
            error
          );
        }
      }

      console.debug(`🌐 [Cover Image] Sending enhanced torrent to backend:`, {
        name: enhancedTorrent.Name,
        favoriteEntryId: enhancedTorrent.favoriteEntryId,
        isCachedLink: enhancedTorrent.isCachedLink,
        cachedLinkId: enhancedTorrent.cachedLinkId,
      });

      // Use endpoint that takes the full torrent object for better matching
      const response = await fetch(
        `${
          backendUrl
        }/api/cache/cover-image/torrent`,
        {
          method: 'POST',
          credentials: 'include',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(enhancedTorrent),
        }
      );

      if (response.ok) {
        // Backend returns JSON responses with the stored (S3) image URL
        const data = await response.json();

        if (data.success && data.imageUrl) {
          const resultUrl = data.imageUrl;

          // Cache in memory for session
          this.cacheCover(key, {
            imageUrl: resultUrl,
            originalUrl: data.originalUrl || resultUrl,
            timestamp: Date.now(),
            torrentName: torrent.Name,
            fallbackUrls: Array.isArray(data.fallbackUrls)
              ? data.fallbackUrls.map((f: any) =>
                  typeof f === 'string' ? f : f?.url
                ).filter(Boolean)
              : [],
          });

          console.debug(
            `✅ [Cover Image] Loaded from backend: "${
              torrent.Name
            }" -> ${resultUrl.substring(0, 50)}...`
          );
          return resultUrl;
        }
      } else if (response.status === 404) {
        console.debug(
          `❌ [Cover Image] Not found in backend (404): "${torrent.Name}"`
        );
      } else {
        console.debug(
          `❌ [Cover Image] Backend retrieval failed with status ${response.status}: "${torrent.Name}"`
        );
      }
    } catch (backendError) {
      console.debug(
        `❌ [Cover Image] Backend retrieval error for "${torrent.Name}":`,
        backendError
      );
    }

    return null;
  }

  /**
   * Get existing cover image for torrent migration (backend-only check)
   */
  async getExistingCoverImageForMigration(
    torrent: Torrent
  ): Promise<string | null> {
    // Just use the regular getCoverImage method
    return this.getCoverImage(torrent);
  }

  /**
   * Remove cover image for a torrent (backend-only removal)
   */
  async removeCoverImage(torrent: Torrent): Promise<boolean> {
    const key = this.getTorrentKey(torrent);

    // Remove from memory cache
    this.inMemoryCache.delete(key);

    // Remove from backend
    try {
      const response = await fetch(
        `${
          backendUrl
        }/api/cache/cover-image`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ torrent }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.debug(`✅ [Cover Image] Removed from backend for "${torrent.Name}"`);
          return true;
        }
      }

      console.warn(`⚠️ [Cover Image] Failed to remove from backend for "${torrent.Name}"`);
      return false;
    } catch (error) {
      console.error(`❌ [Cover Image] Error removing from backend:`, error);
      return false;
    }
  }

  /**
   * Check if torrent has a cover image (backend check)
   */
  async hasCoverImage(torrent: Torrent): Promise<boolean> {
    const coverUrl = await this.getCoverImage(torrent);
    return !!coverUrl;
  }

  /**
   * Synchronous version of getCoverImage for compatibility (uses memory cache only)
   */
  getCoverImageSync(torrent: Torrent): string | null {
    const key = this.getTorrentKey(torrent);
    const cached = this.getCachedCover(key);
    return cached ? cached.imageUrl : null;
  }

  getFallbackUrlsSync(torrent: Torrent): string[] {
    const key = this.getTorrentKey(torrent);
    const cached = this.getCachedCover(key);
    return cached?.fallbackUrls ?? [];
  }

  async getFallbackUrlsAsync(torrent: Torrent): Promise<string[]> {
    // Ensure the cover is loaded into the memory cache first
    await this.getCoverImage(torrent);
    return this.getFallbackUrlsSync(torrent);
  }

  /**
   * Synchronous version of hasCoverImage for compatibility (uses memory cache only)
   */
  hasCoverImageSync(torrent: Torrent): boolean {
    const key = this.getTorrentKey(torrent);
    return !!this.getCachedCover(key);
  }

  /**
   * Get cache statistics (backend stats)
   */
  async getStats(): Promise<{
    memory: { count: number; keys: string[] };
    backend?: any;
  }> {
    const memoryKeys = Array.from(this.inMemoryCache.keys());

    const memoryStats = {
      count: memoryKeys.length,
      keys: memoryKeys,
    };

    // Get backend stats
    let backendStats = null;
    try {
      const response = await fetch(
        `${
          backendUrl
        }/api/cache/stats`,
        { credentials: 'include', headers: getAuthHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          backendStats = data.stats;
        }
      }
    } catch (error) {
      console.debug('Unable to get backend stats:', error);
    }

    return {
      memory: memoryStats,
      backend: backendStats,
    };
  }

  /**
   * Synchronous version of getStats for compatibility
   */
  getStatsSync(): { count: number; keys: string[] } {
    const memoryKeys = Array.from(this.inMemoryCache.keys());

    return {
      count: memoryKeys.length,
      keys: memoryKeys,
    };
  }

  /**
   * Get all cover data from memory (for debugging)
   */
  getAllCovers(): Record<string, CoverImageData> {
    const result: Record<string, CoverImageData> = {};
    this.inMemoryCache.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Test method: Validate cover image workflow for a specific torrent (backend-only)
   */
  async testCoverImageWorkflow(torrent: Torrent): Promise<{
    memoryCheck: boolean;
    backendCheck: boolean;
    key: string;
    memoryData?: any;
    backendData?: any;
    errors: string[];
  }> {
    const key = this.getTorrentKey(torrent);
    const errors: string[] = [];

    // Test memory cache
    const memoryData = this.getCachedCover(key);
    const memoryCheck = !!memoryData;

    // Test backend storage
    let backendCheck = false;
    let backendData = null;

    try {
      const coverUrl = await this.getCoverImage(torrent);
      if (coverUrl) {
        backendCheck = true;
        backendData = { imageUrl: coverUrl };
      }
    } catch (error: any) {
      errors.push(`Backend error: ${error.message}`);
    }

    return {
      memoryCheck,
      backendCheck,
      key,
      memoryData,
      backendData,
      errors,
    };
  }

  /**
   * Debug method: Check cover image availability for favorites (backend-only)
   */
  async debugCoverImageAvailabilityForFavorites(favorites: any[]): Promise<{
    total: number;
    memoryAvailable: number;
    backendChecked: number;
    backendAvailable: number;
    details: Array<{
      name: string;
      key: string;
      memoryAvailable: boolean;
      backendAvailable: boolean;
    }>;
  }> {
    const result = {
      total: favorites.length,
      memoryAvailable: 0,
      backendChecked: 0,
      backendAvailable: 0,
      details: [] as Array<{
        name: string;
        key: string;
        memoryAvailable: boolean;
        backendAvailable: boolean;
      }>,
    };

    for (const favorite of favorites) {
      const key = this.getTorrentKey(favorite);
      const memoryAvailable = !!this.getCachedCover(key);

      let backendAvailable = false;

      try {
        const coverUrl = await this.getCoverImage(favorite);
        backendAvailable = !!coverUrl;
        result.backendChecked++;

        if (backendAvailable) {
          result.backendAvailable++;
        }
      } catch (error) {
        // Network error - count as not available
      }

      if (memoryAvailable) result.memoryAvailable++;

      result.details.push({
        name: favorite.Name,
        key,
        memoryAvailable,
        backendAvailable,
      });
    }

    return result;
  }

  /**
   * Batch load cover images from backend for multiple torrents
   */
  async batchLoadFromBackend(torrents: Torrent[]): Promise<{
    loaded: number;
    total: number;
    failed: string[];
  }> {
    const results = {
      loaded: 0,
      total: torrents.length,
      failed: [] as string[],
    };

    if (torrents.length === 0) {
      return results;
    }

    // Process in larger batches for better performance (increased from 3 to 8)
    const batchSize = 8;
    for (let i = 0; i < torrents.length; i += batchSize) {
      const batch = torrents.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (torrent) => {
          try {
            const key = this.getTorrentKey(torrent);

            // Skip if already have cover image in memory
            if (this.getCachedCover(key)) {
              results.loaded++;
              return;
            }

            // Try to load from backend
            const coverImageUrl = await this.getCoverImage(torrent);
            if (coverImageUrl) {
              results.loaded++;
            } else {
              results.failed.push(torrent.Name);
            }
          } catch (error) {
            console.warn(
              `⚠️ [Cover Images] Failed to preload cover for: ${torrent.Name}`,
              error
            );
            results.failed.push(torrent.Name);
          }
        })
      );

      // Reduced delay between batches for faster loading (300ms -> 100ms)
      if (i + batchSize < torrents.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Migrate localStorage cover images to backend
   */
  async migrateLocalStorageToBackend(
    onProgress?: (current: number, total: number, torrentName: string) => void
  ): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
    total: number;
    errors: Array<{ torrent: string; error: string }>;
  }> {
    const LEGACY_STORAGE_KEY = 'torrent-cover-images';
    const results = {
      migrated: 0,
      skipped: 0,
      failed: 0,
      total: 0,
      errors: [] as Array<{ torrent: string; error: string }>,
    };

    try {
      // Try to read from old localStorage key
      const storedData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!storedData) {
        console.log('📦 [Migration] No localStorage cover images found to migrate');
        return results;
      }

      const localCovers: Record<string, CoverImageData> = JSON.parse(storedData);
      const entries = Object.entries(localCovers);
      results.total = entries.length;

      console.log(`📦 [Migration] Found ${results.total} cover images in localStorage`);

      // Process in batches
      const batchSize = 3;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async ([key, coverData], batchIndex) => {
            const currentIndex = i + batchIndex + 1;
            const torrentName = coverData.torrentName || 'Unknown';

            if (onProgress) {
              onProgress(currentIndex, results.total, torrentName);
            }

            try {
              // Check if already exists in backend
              const mockTorrent: Partial<Torrent> = {
                Name: coverData.torrentName,
                Source: 'unknown',
                Size: 'unknown',
              };

              const existingCover = await this.getCoverImage(mockTorrent as Torrent);
              if (existingCover) {
                console.log(`⏭️ [Migration] Skipping "${torrentName}" (already in backend)`);
                results.skipped++;
                return;
              }

              // Upload to backend
              const response = await fetch(
                `${
                  backendUrl
                }/api/cache/cover-image`,
                {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    torrent: mockTorrent,
                    imageUrl: coverData.imageUrl,
                    originalUrl: coverData.originalUrl,
                  }),
                }
              );

              if (response.ok) {
                const result = await response.json();
                if (result.success) {
                  console.log(`✅ [Migration] Migrated "${torrentName}"`);
                  results.migrated++;
                } else {
                  console.warn(`❌ [Migration] Failed "${torrentName}":`, result.error);
                  results.failed++;
                  results.errors.push({
                    torrent: torrentName,
                    error: result.error || 'Unknown error',
                  });
                }
              } else {
                console.warn(`❌ [Migration] Failed "${torrentName}": HTTP ${response.status}`);
                results.failed++;
                results.errors.push({
                  torrent: torrentName,
                  error: `HTTP ${response.status}`,
                });
              }
            } catch (error: any) {
              console.error(`❌ [Migration] Error migrating "${torrentName}":`, error);
              results.failed++;
              results.errors.push({
                torrent: torrentName,
                error: error.message || 'Unknown error',
              });
            }
          })
        );

        // Small delay between batches
        if (i + batchSize < entries.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(`📦 [Migration] Complete: ${results.migrated} migrated, ${results.skipped} skipped, ${results.failed} failed`);
      return results;
    } catch (error: any) {
      console.error('❌ [Migration] Fatal error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Check if there are localStorage cover images to migrate
   */
  hasLocalStorageCoversToMigrate(): boolean {
    try {
      const LEGACY_STORAGE_KEY = 'torrent-cover-images';
      const storedData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!storedData) return false;

      const localCovers = JSON.parse(storedData);
      return Object.keys(localCovers).length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get count of localStorage covers available for migration
   */
  getLocalStorageCoverCount(): number {
    try {
      const LEGACY_STORAGE_KEY = 'torrent-cover-images';
      const storedData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!storedData) return 0;

      const localCovers = JSON.parse(storedData);
      return Object.keys(localCovers).length;
    } catch {
      return 0;
    }
  }

  /**
   * Clear localStorage covers after successful migration
   */
  clearLocalStorageCovers(): void {
    try {
      const LEGACY_STORAGE_KEY = 'torrent-cover-images';
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      console.log('✅ [Migration] Cleared localStorage covers');
    } catch (error) {
      console.error('❌ [Migration] Failed to clear localStorage:', error);
    }
  }
}

// Global service instance
export const enhancedCoverImageService = new EnhancedCoverImageService();

// Export migration helpers
export const coverImageMigration = {
  getExistingCoverImageForMigration: (torrent: Torrent) =>
    enhancedCoverImageService.getExistingCoverImageForMigration(torrent),
};

// Backward compatibility - export the enhanced service as the original name
export const coverImageService = {
  setCoverImage: async (
    torrent: Torrent,
    imageUrl: string,
    originalUrl: string
  ) =>
    await enhancedCoverImageService.setCoverImage(
      torrent,
      imageUrl,
      originalUrl
    ),
  getCoverImage: (torrent: Torrent) =>
    enhancedCoverImageService.getCoverImageSync(torrent), // Use sync version for compatibility
  getCoverImageAsync: (torrent: Torrent) =>
    enhancedCoverImageService.getCoverImage(torrent), // Async version for components that can handle it
  getFallbackUrls: (torrent: Torrent) =>
    enhancedCoverImageService.getFallbackUrlsSync(torrent),
  getFallbackUrlsAsync: (torrent: Torrent) =>
    enhancedCoverImageService.getFallbackUrlsAsync(torrent),
  removeCoverImage: (torrent: Torrent) =>
    enhancedCoverImageService.removeCoverImage(torrent),
  hasCoverImage: (torrent: Torrent) =>
    enhancedCoverImageService.hasCoverImageSync(torrent), // Use sync version for compatibility
  getStats: () => enhancedCoverImageService.getStatsSync(), // Use sync version for compatibility
  getAllCovers: () => enhancedCoverImageService.getAllCovers(),
  batchLoadFromBackend: (torrents: Torrent[]) =>
    enhancedCoverImageService.batchLoadFromBackend(torrents),
  testCoverImageWorkflow: (torrent: Torrent) =>
    enhancedCoverImageService.testCoverImageWorkflow(torrent),
  // Migration methods
  migrateLocalStorageToBackend: (
    onProgress?: (current: number, total: number, torrentName: string) => void
  ) => enhancedCoverImageService.migrateLocalStorageToBackend(onProgress),
  hasLocalStorageCoversToMigrate: () =>
    enhancedCoverImageService.hasLocalStorageCoversToMigrate(),
  getLocalStorageCoverCount: () =>
    enhancedCoverImageService.getLocalStorageCoverCount(),
  clearLocalStorageCovers: () =>
    enhancedCoverImageService.clearLocalStorageCovers(),
};

// Expose enhanced service in development mode
if (process.env.NODE_ENV === 'development') {
  (window as any).enhancedCoverImageService = {
    getStats: () => enhancedCoverImageService.getStats(),
    getAllCovers: () => enhancedCoverImageService.getAllCovers(),
    batchLoadFromBackend: (torrents: any[]) =>
      enhancedCoverImageService.batchLoadFromBackend(torrents),
    testCoverImageWorkflow: (torrent: any) =>
      enhancedCoverImageService.testCoverImageWorkflow(torrent),
    debugCoverAvailability: async (favorites?: any[]) => {
      const { favoritesService } = await import('../services/favoritesService');
      const favs = favorites || (await favoritesService.getAllFavorites());
      return enhancedCoverImageService.debugCoverImageAvailabilityForFavorites(
        favs
      );
    },
    // Migration helpers
    migrateLocalStorage: (onProgress?: any) =>
      enhancedCoverImageService.migrateLocalStorageToBackend(onProgress),
    hasLocalStorageToMigrate: () =>
      enhancedCoverImageService.hasLocalStorageCoversToMigrate(),
    getLocalStorageCount: () =>
      enhancedCoverImageService.getLocalStorageCoverCount(),
    clearLocalStorage: () => enhancedCoverImageService.clearLocalStorageCovers(),
  };
}

export default enhancedCoverImageService;
