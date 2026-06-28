import { Torrent } from '../types/Torrent';

/**
 * COVER IMAGE MANAGEMENT SERVICE
 *
 * This service provides:
 * - Persistent storage of cover images using localStorage
 * - Unique key generation based on torrent properties
 * - Cache management with size tracking
 * - Development tools for debugging
 */

interface CoverImageData {
  imageUrl: string;
  originalUrl: string;
  timestamp: number;
  torrentName: string;
}

class CoverImageService {
  private readonly STORAGE_KEY = 'torrent-cover-images';

  /**
   * Generate a unique key for a torrent based on its properties
   */
  private getTorrentKey(torrent: Torrent): string {
    // Use name, source, and size to create a unique identifier
    const identifier = `${torrent.Name}_${torrent.Source}_${torrent.Size}`;
    return identifier.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  /**
   * Get all stored cover images
   */
  private getStoredCovers(): Record<string, CoverImageData> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Save cover images to localStorage
   */
  private saveCovers(covers: Record<string, CoverImageData>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(covers));
    } catch (error) {
      // Silently fail localStorage errors
    }
  }

  /**
   * Set a cover image for a torrent. The backend handles S3 object storage;
   * here we just cache the image URL locally.
   */
  async setCoverImage(torrent: Torrent, imageUrl: string, originalUrl: string): Promise<void> {
    const key = this.getTorrentKey(torrent);
    const covers = this.getStoredCovers();

    covers[key] = {
      imageUrl,
      originalUrl,
      timestamp: Date.now(),
      torrentName: torrent.Name,
    };

    this.saveCovers(covers);
  }

  /**
   * Get cover image for a torrent
   */
  getCoverImage(torrent: Torrent): string | null {
    const key = this.getTorrentKey(torrent);
    const covers = this.getStoredCovers();

    const coverData = covers[key];
    if (coverData) {
      return coverData.imageUrl;
    }

    return null;
  }

  /**
   * Get cover image for a torrent (async version for consistency with enhanced service)
   */
  async getCoverImageAsync(torrent: Torrent): Promise<string | null> {
    return this.getCoverImage(torrent);
  }

  /**
   * Remove cover image for a torrent
   */
  removeCoverImage(torrent: Torrent): boolean {
    const key = this.getTorrentKey(torrent);
    const covers = this.getStoredCovers();

    if (covers[key]) {
      delete covers[key];
      this.saveCovers(covers);
      return true;
    }

    return false;
  }

  /**
   * Check if torrent has a cover image
   */
  hasCoverImage(torrent: Torrent): boolean {
    const key = this.getTorrentKey(torrent);
    const covers = this.getStoredCovers();
    return !!covers[key];
  }

  /**
   * Get cache statistics
   */
  getStats(): { count: number; keys: string[]; estimatedSize: string } {
    const covers = this.getStoredCovers();
    const keys = Object.keys(covers);

    // Estimate size in bytes
    const estimatedBytes = JSON.stringify(covers).length * 2; // Rough UTF-16 estimate
    let estimatedSize: string;

    if (estimatedBytes < 1024) {
      estimatedSize = `${estimatedBytes} B`;
    } else if (estimatedBytes < 1024 * 1024) {
      estimatedSize = `${(estimatedBytes / 1024).toFixed(1)} KB`;
    } else {
      estimatedSize = `${(estimatedBytes / 1024 / 1024).toFixed(1)} MB`;
    }

    return {
      count: keys.length,
      keys,
      estimatedSize,
    };
  }


  /**
   * Get all cover data (for debugging)
   */
  getAllCovers(): Record<string, CoverImageData> {
    return this.getStoredCovers();
  }
}

// Global service instance
export const coverImageService = new CoverImageService();

// Expose service in development mode
if (process.env.NODE_ENV === 'development') {
  (window as any).coverImageService = {
    getStats: () => {
      const stats = coverImageService.getStats();
      console.table({
        'Cover Images': stats.count,
        'Storage Size': stats.estimatedSize,
        'Max Allowed': 50,
      });
      return stats;
    },
    getAllCovers: () => coverImageService.getAllCovers(),
  };
}
