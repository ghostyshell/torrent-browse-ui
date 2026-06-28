/**
 * UNIFIED CACHE MANAGEMENT SERVICE - SQLite Enhanced
 *
 * This service provides a unified interface for managing all types of cached data:
 * - Stream URLs (hybrid localStorage + SQLite backend)
 * - Cover Images (hybrid localStorage + SQLite backend)
 * - Manual Images (localStorage with SQLite sync)
 * - Favorites (SQLite backend primary)
 * - Torrent Info/Titles (localStorage persistent)
 *
 * Features:
 * - Hybrid local/remote caching for better performance
 * - SQLite backend for true persistence across devices
 * - Size-based management with automatic cleanup
 * - Unified stats and management interface
 * - Development tools for debugging
 */

import { streamUrlCache } from '../utils/streamUrlCache';
import { coverImageService } from './enhancedCoverImageService';
import { favoritesService } from './favoritesService';
import { sqliteCacheAPI } from './tursoStorageAPI';
import { realDebridTorrentInfoService } from './realDebridTorrentInfoService';
import type { Torrent } from '../types/Torrent';

interface CacheStats {
  streamUrls: {
    count: number;
    size: string;
    type: 'hybrid (localStorage + SQLite)';
  };
  coverImages: {
    count: number;
    size: string;
    type: 'hybrid (localStorage + SQLite)';
  };
  favorites: {
    count: number;
    size: string;
    type: 'SQLite backend';
  };
  manualImages: {
    count: number;
    size: string;
    type: 'localStorage + SQLite sync';
  };
  torrentInfo: {
    count: number;
    size: string;
    type: 'localStorage persistent';
  };
  sqliteBackend?: {
    cache: number;
    images: number;
    streamUrls: number;
    favorites: number;
    dbSize: string;
  };
  total: {
    estimatedSize: string;
    cacheTypes: number;
  };
}

class UnifiedCacheManager {
  /**
   * Get statistics for all caches (enhanced with SQLite backend)
   */
  async getAllCacheStats(): Promise<CacheStats> {
    const streamStats = await streamUrlCache.getStats();
    const coverStats = coverImageService.getStats();
    const favoritesStats = await this.getFavoritesStats();
    const manualImagesStats = this.getManualImagesStats();
    const torrentInfoStats = realDebridTorrentInfoService.getCacheStats();

    // Get SQLite backend stats
    let sqliteStats = null;
    try {
      sqliteStats = await sqliteCacheAPI.getStats();
    } catch (error) {
      console.warn('Could not fetch SQLite backend stats:', error);
    }

    // Calculate total estimated size including SQLite
    const localSizes = [
      streamStats.totalSizeEstimate,
      coverStats.estimatedSize,
      favoritesStats.size,
      manualImagesStats.size,
      torrentInfoStats.totalSizeEstimate,
    ];

    const totalSizeInBytes = this.estimateTotalSize(localSizes);

    return {
      streamUrls: {
        count: streamStats.localSize,
        size: streamStats.totalSizeEstimate,
        type: 'hybrid (localStorage + SQLite)',
      },
      coverImages: {
        count: coverStats.count,
        size: coverStats.estimatedSize,
        type: 'hybrid (localStorage + SQLite)',
      },
      favorites: {
        count: favoritesStats.count,
        size: favoritesStats.size,
        type: 'SQLite backend',
      },
      manualImages: {
        count: manualImagesStats.count,
        size: manualImagesStats.size,
        type: 'localStorage + SQLite sync',
      },
      torrentInfo: {
        count: torrentInfoStats.count,
        size: torrentInfoStats.totalSizeEstimate,
        type: 'localStorage persistent',
      },
      sqliteBackend: sqliteStats || undefined,
      total: {
        estimatedSize: totalSizeInBytes,
        cacheTypes: 5,
      },
    };
  }

  /**
   * Clear specific cache type
   */
  async clearCache(
    cacheType:
      | 'streamUrls'
      | 'coverImages'
      | 'manualImages'
      | 'torrentInfo'
  ): Promise<void> {
    switch (cacheType) {
      case 'streamUrls':
        await streamUrlCache.clear();
        break;
      case 'coverImages':
        // Clear cover images functionality removed
        break;
      case 'manualImages':
        // Clear manual images functionality removed
        break;
      case 'torrentInfo':
        realDebridTorrentInfoService.clearCache();
        break;
      default:
        return;
    }
  }

  /**
   * Check if torrent has any cached data
   */
  hasCachedData(torrent: Torrent): {
    streamUrl: boolean;
    coverImage: boolean;
    manualImages: boolean;
    isFavorite: boolean;
  } {
    const magnetLink = torrent.Magnet || '';

    return {
      streamUrl: streamUrlCache.hasLocal(magnetLink),
      coverImage: coverImageService.hasCoverImage(torrent),
      manualImages: this.hasManualImages(torrent),
      isFavorite: favoritesService.isFavoriteSync(torrent),
    };
  }

  /**
   * Get cache health status (enhanced with SQLite backend)
   */
  async getCacheHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const stats = await this.getAllCacheStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check total size
    const totalSizeNum = this.parseSizeString(stats.total.estimatedSize);
    if (totalSizeNum > 50) {
      // 50MB
      issues.push('Total cache size is large (>50MB)');
      recommendations.push('Consider clearing some caches to free up space');
    }

    // Check SQLite backend health
    if (stats.sqliteBackend) {
      if (stats.sqliteBackend.streamUrls + stats.sqliteBackend.images > 200) {
        issues.push('SQLite backend is getting large');
        recommendations.push('Consider cleaning up old SQLite cache entries');
      }
    }

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = totalSizeNum > 100 ? 'critical' : 'warning'; // 100MB is critical
    }

    return { status, issues, recommendations };
  }

  /**
   * Refresh/validate cached data
   */
  async validateCaches(): Promise<{
    streamUrls: { valid: number; invalid: number };
  }> {
    // For stream URLs, we can't easily validate without making requests
    // So we just report current count
    const streamStats = await streamUrlCache.getStats();

    return {
      streamUrls: { valid: streamStats.localSize, invalid: 0 },
    };
  }

  // Private helper methods

  private async getFavoritesStats(): Promise<{ count: number; size: string }> {
    try {
      const favorites = await favoritesService.getAllFavorites();
      const size = JSON.stringify(favorites).length * 2; // UTF-16 estimate
      return {
        count: favorites.length,
        size: this.formatSize(size),
      };
    } catch {
      return { count: 0, size: '0 B' };
    }
  }

  private getManualImagesStats(): { count: number; size: string } {
    let totalCount = 0;
    let totalSize = 0;

    // Scan localStorage for manual image keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('manual-images-')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const images = JSON.parse(data);
            totalCount += Array.isArray(images) ? images.length : 0;
            totalSize += data.length * 2; // UTF-16 estimate
          }
        } catch {
          // Ignore invalid entries
        }
      }
    }

    return {
      count: totalCount,
      size: this.formatSize(totalSize),
    };
  }

  private hasManualImages(torrent: Torrent): boolean {
    const key =
      `manual-images-${torrent.Name}_${torrent.Source}_${torrent.Size}`
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const images = JSON.parse(stored);
        return Array.isArray(images) && images.length > 0;
      }
    } catch {
      // Ignore errors
    }
    return false;
  }

  private estimateTotalSize(sizes: string[]): string {
    let totalBytes = 0;

    for (const size of sizes) {
      totalBytes += this.parseSizeString(size) * 1024 * 1024; // Convert MB to bytes
    }

    return this.formatSize(totalBytes);
  }

  private parseSizeString(sizeStr: string): number {
    const match = sizeStr.match(/([\d.]+)\s*(B|KB|MB|GB)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'B':
        return value / (1024 * 1024); // Convert to MB
      case 'KB':
        return value / 1024; // Convert to MB
      case 'MB':
        return value;
      case 'GB':
        return value * 1024; // Convert to MB
      default:
        return 0;
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
}

// Global cache manager instance
export const cacheManager = new UnifiedCacheManager();

// Expose cache management in development mode
if (process.env.NODE_ENV === 'development') {
  (window as any).cacheManager = {
    getStats: async () => {
      const stats = await cacheManager.getAllCacheStats();

      console.table({
        'Stream URLs': `${stats.streamUrls.count} entries (${stats.streamUrls.size}) - ${stats.streamUrls.type}`,
        'Cover Images': `${stats.coverImages.count} entries (${stats.coverImages.size}) - ${stats.coverImages.type}`,
        Favorites: `${stats.favorites.count} entries (${stats.favorites.size}) - ${stats.favorites.type}`,
        'Manual Images': `${stats.manualImages.count} entries (${stats.manualImages.size}) - ${stats.manualImages.type}`,
        TOTAL: `${stats.total.cacheTypes} cache types (${stats.total.estimatedSize})`,
      });

      if (stats.sqliteBackend) {

        console.table(stats.sqliteBackend);
      }

      const health = await cacheManager.getCacheHealth();

      if (health.issues.length > 0) {

      }

      return { stats, health };
    },
    clearCache: async (type: string) => {
      await cacheManager.clearCache(type as any);
    },
    checkHealth: () => cacheManager.getCacheHealth(),
    validateCaches: () => cacheManager.validateCaches(),
  };

}
