import { Torrent } from '../types/Torrent';
import { FavoriteTorrent } from './favoritesService';
import { torrentApi } from './torrentApi';
import { enhancedCoverImageService } from './enhancedCoverImageService';

/**
 * DESCRIPTION AND IMAGE EXTRACTION SERVICE
 *
 * This service provides:
 * - Fetching and caching torrent descriptions
 * - Extracting images from descriptions
 * - Auto-setting cover images for torrents without covers
 * - Batch processing capabilities
 */

interface DescriptionData {
  description?: string;
  images: { originalUrl: string; directUrl: string }[];
  files?: { name: string; size: string }[];
  comments?: { author: string; comment: string; date: string }[];
  error?: string;
}

interface CachedDescriptionData extends DescriptionData {
  timestamp: number;
  torrentName: string;
}

class DescriptionImageService {
  private readonly STORAGE_KEY = 'torrent-descriptions-cache';

  /**
   * Generate a unique key for a torrent based on its properties
   */
  private getTorrentKey(torrent: Torrent | FavoriteTorrent): string {
    const identifier = `${torrent.Name}_${torrent.Source}_${torrent.Size}`;
    return identifier.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  /**
   * Get all stored descriptions from localStorage
   */
  private getStoredDescriptions(): Record<string, CachedDescriptionData> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {

      return {};
    }
  }

  /**
   * Save descriptions to localStorage
   */
  private saveDescriptions(
    descriptions: Record<string, CachedDescriptionData>
  ): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(descriptions));
    } catch (error) {

    }
  }

  /**
   * Fetch and cache description and images for a single torrent
   */
  async fetchAndCacheDescriptionImages(
    torrent: Torrent | FavoriteTorrent
  ): Promise<DescriptionData> {
    const key = this.getTorrentKey(torrent);
    const descriptions = this.getStoredDescriptions();

    // Check if already cached and not expired (7 days)
    const cached = descriptions[key];
    if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {

      return cached;
    }

    try {
      // Fetch fresh data from API
      const details = await torrentApi.getTorrentDetails(
        torrent.Source || 'piratebay',
        torrent.Url
      );

      const descriptionData: DescriptionData = {
        description: details.description,
        images: details.images || [],
        files: details.files || [],
        comments: details.comments || [],
        error: details.error,
      };

      // Cache the result
      descriptions[key] = {
        ...descriptionData,
        timestamp: Date.now(),
        torrentName: torrent.Name,
      };
      this.saveDescriptions(descriptions);

      return descriptionData;
    } catch (error) {

      return {
        description: 'Failed to load description',
        images: [],
        files: [],
        comments: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cached description for a torrent (no API call)
   */
  getCachedDescription(
    torrent: Torrent | FavoriteTorrent
  ): CachedDescriptionData | null {
    const key = this.getTorrentKey(torrent);
    const descriptions = this.getStoredDescriptions();
    return descriptions[key] || null;
  }

  /**
   * Try to get higher resolution version of an image URL
   */
  private getHigherResolutionUrl(directUrl: string): string {
    try {
      // For trafficimage.club - remove .md from filename to get full size image
      if (directUrl.includes('trafficimage.club')) {
        // Remove .md from the filename (e.g., .md.jpg -> .jpg)
        return directUrl.replace(/\.md(\.[^.]+)$/, '$1');
      }

      // For postimg.cc - try to get full size by replacing size parameters
      if (directUrl.includes('postimg.cc')) {
        // Replace thumbnail size indicators with full size
        return directUrl
          .replace(/\/[st]\d+x\d+\//, '/') // Remove size restrictions like /s320x240/ or /t640x480/
          .replace(/_thumb\./, '.') // Remove thumbnail indicators
          .replace(/\?[^=]*thumb[^=]*=[^&]*(&|$)/, ''); // Remove thumbnail query params
      }

      // For imgbb.com - try to get original size
      if (directUrl.includes('ibb.co')) {
        // Replace size parameters in the URL
        return directUrl.replace(/\/[st]\d+x\d+\//, '/');
      }

      // For imgur - try to get high quality version
      if (directUrl.includes('imgur.com')) {
        // Remove size suffixes and add high quality suffix
        return directUrl
          .replace(/[sbtlmh]\.jpg$/, '.jpg') // Remove size suffixes
          .replace(/\.jpg$/, 'h.jpg'); // Add high quality suffix
      }

      // For fastpic.org - try to get original
      if (directUrl.includes('fastpic.org')) {
        // Try to remove size restrictions in the URL
        return directUrl.replace(/\/thumbs\//, '/big/');
      }

      // For direct image URLs, try to remove common thumbnail indicators including .md suffix
      return directUrl
        .replace(/\.md(\.[^.]+)$/, '$1') // Remove .md suffix (e.g., .md.jpg -> .jpg)
        .replace(/_thumb(\.[^.]+)$/, '$1') // Remove _thumb suffix
        .replace(/_small(\.[^.]+)$/, '$1') // Remove _small suffix
        .replace(/_medium(\.[^.]+)$/, '$1') // Remove _medium suffix
        .replace(/\.thumb(\.[^.]+)$/, '$1'); // Remove .thumb suffix
    } catch (error) {

      return directUrl; // Return original URL if enhancement fails
    }
  }

  /**
   * Auto-set cover image for torrent from the first 3 images (random selection)
   */
  async autoSetCoverImage(
    torrent: Torrent | FavoriteTorrent,
    images: { originalUrl: string; directUrl: string }[]
  ): Promise<boolean> {
    // Check if torrent already has a cover image
    const hasCover = await enhancedCoverImageService.hasCoverImage(torrent);
    if (hasCover) {
      return false;
    }

    // Get first 3 images
    const firstThreeImages = images.slice(0, 3);
    if (firstThreeImages.length === 0) {
      return false;
    }

    // Randomly select one from the first 3
    const randomIndex = Math.floor(Math.random() * firstThreeImages.length);
    const selectedImage = firstThreeImages[randomIndex];

    // Try to get higher resolution version of the image
    const enhancedImageUrl = this.getHigherResolutionUrl(
      selectedImage.directUrl
    );
    let finalImageUrl =
      enhancedImageUrl !== selectedImage.directUrl
        ? enhancedImageUrl
        : selectedImage.directUrl;

    // If we enhanced the URL, try to validate it works, fallback to cleaned original if not
    if (enhancedImageUrl !== selectedImage.directUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const testResponse = await fetch(finalImageUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!testResponse.ok) {

          // Fallback to original but still remove .md suffix
          finalImageUrl = selectedImage.directUrl.replace(
            /\.md(\.[^.]+)$/,
            '$1'
          );
        }
      } catch (error) {

        // Fallback to original but still remove .md suffix
        finalImageUrl = selectedImage.directUrl.replace(/\.md(\.[^.]+)$/, '$1');
      }
    } else {
      // URL was not enhanced, but still ensure .md suffix is removed
      finalImageUrl = selectedImage.directUrl.replace(/\.md(\.[^.]+)$/, '$1');
    }

    try {
      await enhancedCoverImageService.setCoverImage(
        torrent,
        finalImageUrl, // Use the enhanced URL for better quality
        selectedImage.originalUrl
      );

      return true;
    } catch (error) {

      return false;
    }
  }

  /**
   * Force set cover image for torrent, replacing any existing cover
   */
  async forceSetCoverImage(
    torrent: Torrent | FavoriteTorrent,
    images: { originalUrl: string; directUrl: string }[]
  ): Promise<boolean> {
    const firstThreeImages = images.slice(0, 3);
    if (firstThreeImages.length === 0) {
      return false;
    }

    const randomIndex = Math.floor(Math.random() * firstThreeImages.length);
    const selectedImage = firstThreeImages[randomIndex];

    const enhancedImageUrl = this.getHigherResolutionUrl(
      selectedImage.directUrl
    );
    let finalImageUrl =
      enhancedImageUrl !== selectedImage.directUrl
        ? enhancedImageUrl
        : selectedImage.directUrl;

    if (enhancedImageUrl !== selectedImage.directUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const testResponse = await fetch(finalImageUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!testResponse.ok) {
          finalImageUrl = selectedImage.directUrl.replace(
            /\.md(\.[^.]+)$/,
            '$1'
          );
        }
      } catch {
        finalImageUrl = selectedImage.directUrl.replace(/\.md(\.[^.]+)$/, '$1');
      }
    } else {
      finalImageUrl = selectedImage.directUrl.replace(/\.md(\.[^.]+)$/, '$1');
    }

    try {
      await enhancedCoverImageService.setCoverImage(
        torrent,
        finalImageUrl,
        selectedImage.originalUrl
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Process single torrent: fetch description, extract images, and set cover if needed
   */
  async processTorrentDescriptionAndImages(
    torrent: Torrent | FavoriteTorrent,
    options: { forceRefresh?: boolean } = {}
  ): Promise<{
    success: boolean;
    error?: string;
    imagesFound: number;
    coverSet: boolean;
  }> {
    try {
      // Force refresh: clear cached description so we re-fetch
      if (options.forceRefresh) {
        const key = this.getTorrentKey(torrent);
        const descriptions = this.getStoredDescriptions();
        delete descriptions[key];
        this.saveDescriptions(descriptions);
      }

      const descriptionData = await this.fetchAndCacheDescriptionImages(
        torrent
      );

      if (descriptionData.error) {
        return {
          success: false,
          error: descriptionData.error,
          imagesFound: 0,
          coverSet: false,
        };
      }

      const imagesFound = descriptionData.images.length;
      let coverSet = false;

      if (imagesFound > 0) {
        coverSet = options.forceRefresh
          ? await this.forceSetCoverImage(torrent, descriptionData.images)
          : await this.autoSetCoverImage(torrent, descriptionData.images);
      }

      return {
        success: true,
        imagesFound,
        coverSet,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        imagesFound: 0,
        coverSet: false,
      };
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { count: number; keys: string[]; estimatedSize: string } {
    const descriptions = this.getStoredDescriptions();
    const keys = Object.keys(descriptions);

    // Estimate size in bytes
    const estimatedBytes = JSON.stringify(descriptions).length * 2; // Rough UTF-16 estimate
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
   * Get all description data (for debugging)
   */
  getAllDescriptions(): Record<string, CachedDescriptionData> {
    return this.getStoredDescriptions();
  }
}

// Global service instance
export const descriptionImageService = new DescriptionImageService();

// Expose service in development mode
if (process.env.NODE_ENV === 'development') {
  (window as any).descriptionImageService = {
    getStats: () => {
      const stats = descriptionImageService.getStats();
      console.table({
        'Cached Descriptions': stats.count,
        'Storage Size': stats.estimatedSize,
      });
      return stats;
    },
    getAllDescriptions: () => descriptionImageService.getAllDescriptions(),
  };

}

export default descriptionImageService;
