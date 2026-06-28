import apiClient from './apiClient';

/**
 * TURSO DATABASE STORAGE API SERVICE
 *
 * This service interfaces with the Turso-backed backend storage API
 * Provides persistent, cloud database storage for all application data
 */

import { backendUrl } from '../config/env';
const BACKEND_URL = backendUrl;

interface StorageStats {
  cache: number;
  images: number;
  streamUrls: number;
  favorites: number;
  dbSize: string;
}

interface StreamData {
  streamUrl: string;
  filename?: string;
  filesize?: number;
  supportsRangeRequests?: boolean;
  torrentName?: string;
}

interface StoredStreamData extends StreamData {
  cachedAt: number;
  lastAccessed: number;
}

class TursoStorageAPI {
  private baseUrl: string;

  constructor(backendUrl: string = BACKEND_URL) {
    this.baseUrl = backendUrl;
  }

  // Test backend connectivity
  async testConnection(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health');
      return true;
    } catch (error: any) {
      return false;
    }
  }

  // === STORAGE STATISTICS ===

  async getStats(): Promise<StorageStats | null> {
    try {
      const response = await apiClient.get('/api/storage/stats');
      if (response.data.success) {

        return response.data.stats;
      }
      return null;
    } catch (error) {

      return null;
    }
  }


  // === COVER IMAGES ===

  async setCoverImage(
    torrent: any,
    imageUrl: string,
    imageData?: string
  ): Promise<boolean> {
    try {
      const response = await apiClient.post(
        '/api/storage/cover-image',
        {
          torrent,
          imageUrl,
          imageData,
        }
      );

      if (response.data.success) {
        return true;
      }
      return false;
    } catch (error) {

      return false;
    }
  }

  async getCoverImage(torrent: any): Promise<string | null> {
    try {
      const torrentKey = this.generateTorrentKey(torrent);
      const response = await apiClient.get(
        `/api/storage/cover-image/${torrentKey}`
      );

      if (response.data.success) {
        // Backend returns the stored cover image URL (S3 object storage)
        return response.data.imageUrl;
      }
      return null;
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.warn(`⚠️ [Turso Storage] Error getting cover image:`, error.message);
      }
      return null;
    }
  }

  // Get cover image for any torrent object
  async getCoverImageForTorrent(torrent: any): Promise<{ type: string; imageUrl?: string; originalUrl?: string } | null> {
    try {
      const response = await apiClient.post(
        '/api/storage/cover-image/torrent',
        torrent
      );

      if (response.data.success) {
        return response.data.coverImage;
      }
      return null;
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.warn('Error getting cover image for torrent:', error.message);
      }
      return null;
    }
  }

  // Update cover image for favorite entry
  async updateFavoriteEntryCoverImage(favoriteId: string, coverImageUrl: string): Promise<boolean> {
    try {
      const response = await apiClient.put(
        `/api/storage/cover-image/favorite/${favoriteId}`,
        { coverImageUrl }
      );

      return response.data.success;
    } catch (error: any) {
      console.warn('Error updating favorite entry cover image:', error.message);
      return false;
    }
  }

  // Update cover image for torrent details
  async updateTorrentDetailsCoverImage(favoriteId: string, source: string, coverImageUrl: string): Promise<boolean> {
    try {
      const response = await apiClient.put(
        `/api/storage/cover-image/torrent-details/${favoriteId}/${source}`,
        { coverImageUrl }
      );

      return response.data.success;
    } catch (error: any) {
      console.warn('Error updating torrent details cover image:', error.message);
      return false;
    }
  }

  // Update cover image for cached link
  async updateCachedLinkCoverImage(cachedLinkId: string, coverImageUrl: string): Promise<boolean> {
    try {
      const response = await apiClient.put(
        `/api/storage/cover-image/cached-link/${cachedLinkId}`,
        { coverImageUrl }
      );

      return response.data.success;
    } catch (error: any) {
      console.warn('Error updating cached link cover image:', error.message);
      return false;
    }
  }

  // === STREAM URLS ===

  async setStreamUrl(
    magnetLink: string,
    streamData: StreamData
  ): Promise<boolean> {
    try {
      const magnetHash = this.extractMagnetHash(magnetLink);

      const response = await apiClient.post(
        '/api/storage/stream-url',
        {
          magnetLink,
          streamData,
        }
      );

      if (response.data.success) {
        return true;
      }
      return false;
    } catch (error: any) {
      return false;
    }
  }

  async getStreamUrl(magnetLink: string): Promise<StoredStreamData | null> {
    try {
      const magnetHash = this.extractMagnetHash(magnetLink);

      const response = await apiClient.get(
        `/api/storage/stream-url/${magnetHash}`
      );

      if (response.data.success) {
        return {
          streamUrl: response.data.streamUrl,
          filename: response.data.filename,
          filesize: response.data.filesize,
          supportsRangeRequests: response.data.supportsRangeRequests,
          cachedAt: response.data.cachedAt,
          lastAccessed: response.data.lastAccessed,
        };
      }

      return null;
    } catch (error: any) {
      return null;
    }
  }

  async deleteStreamUrl(magnetLink: string): Promise<boolean> {
    try {
      const magnetHash = this.extractMagnetHash(magnetLink);

      const response = await apiClient.delete(
        `/api/storage/stream-url/${magnetHash}`
      );

      if (response.data.success) {
        return true;
      }

      return false;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return true; // Consider 404 as success since the URL is gone
      }
      return false;
    }
  }

  // === FAVORITES ===

  async addFavorite(torrent: any, coverImageUrl?: string): Promise<boolean> {
    try {
      const response = await apiClient.post('/api/storage/favorites', {
        torrent,
        coverImageUrl,
      });

      if (response.data.success) {

        return true;
      }
      return false;
    } catch (error) {

      return false;
    }
  }

  async removeFavorite(torrent: any): Promise<boolean> {
    try {
      const response = await apiClient.delete('/api/storage/favorites', {
        data: { torrent },
      });

      if (response.data.success) {

        return true;
      }
      return false;
    } catch (error) {

      return false;
    }
  }

  async getFavorites(): Promise<any[]> {
    try {
      const response = await apiClient.get('/api/storage/favorites');

      if (response.data.success) {

        return response.data.favorites;
      }
      return [];
    } catch (error) {

      return [];
    }
  }

  // === UTILITY METHODS ===

  private generateTorrentKey(torrent: any): string {
    if (typeof torrent === 'string') return torrent;
    const identifier = `${torrent.Name}_${torrent.Source}_${torrent.Size}`;
    return identifier.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  private extractMagnetHash(magnetLink: string): string {
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

  // === HYBRID LOCAL/REMOTE CACHING ===

  /**
   * Get cover image with hybrid caching strategy:
   * 1. Check localStorage for immediate response
   * 2. Check SQLite backend for persistent storage
   * 3. Update localStorage with backend result
   */
  async getCoverImageHybrid(torrent: any): Promise<string | null> {
    const localKey = `cover_${this.generateTorrentKey(torrent)}`;

    // Check localStorage first for immediate response
    try {
      const localData = localStorage.getItem(localKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        // Check if not too old (24 hours)
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {

          return parsed.imageUrl;
        }
      }
    } catch (error) {

    }

    // Check backend SQLite cache
    const backendResult = await this.getCoverImage(torrent);

    // Update localStorage with backend result
    if (backendResult) {
      try {
        localStorage.setItem(
          localKey,
          JSON.stringify({
            imageUrl: backendResult,
            timestamp: Date.now(),
          })
        );
      } catch (error) {

      }
    }

    return backendResult;
  }

  /**
   * Set cover image with hybrid caching strategy:
   * 1. Store in SQLite backend for persistence
   * 2. Store in localStorage for immediate access
   */
  async setCoverImageHybrid(
    torrent: any,
    imageUrl: string,
    imageData?: string
  ): Promise<boolean> {
    const localKey = `cover_${this.generateTorrentKey(torrent)}`;

    // Store in backend SQLite
    const backendSuccess = await this.setCoverImage(
      torrent,
      imageUrl,
      imageData
    );

    // Also store in localStorage for immediate access
    try {
      localStorage.setItem(
        localKey,
        JSON.stringify({
          imageUrl,
          timestamp: Date.now(),
        })
      );
    } catch (error) {

    }

    return backendSuccess;
  }
}

// Global service instance
export const tursoStorageAPI = new TursoStorageAPI();

// Development tools
if (process.env.NODE_ENV === 'development') {
  (window as any).tursoStorageAPI = {
    getStats: () => tursoStorageAPI.getStats(),
    testConnection: () => tursoStorageAPI.testConnection(),
    setCoverImage: (torrent: any, imageUrl: string) =>
      tursoStorageAPI.setCoverImage(torrent, imageUrl),
    getCoverImage: (torrent: any) => tursoStorageAPI.getCoverImage(torrent),
    getCoverImageForTorrent: (torrent: any) => tursoStorageAPI.getCoverImageForTorrent(torrent),
    updateFavoriteEntryCoverImage: (favoriteId: string, coverImageUrl: string) =>
      tursoStorageAPI.updateFavoriteEntryCoverImage(favoriteId, coverImageUrl),
    updateTorrentDetailsCoverImage: (favoriteId: string, source: string, coverImageUrl: string) =>
      tursoStorageAPI.updateTorrentDetailsCoverImage(favoriteId, source, coverImageUrl),
    updateCachedLinkCoverImage: (cachedLinkId: string, coverImageUrl: string) =>
      tursoStorageAPI.updateCachedLinkCoverImage(cachedLinkId, coverImageUrl),
    setStreamUrl: (magnetLink: string, streamData: StreamData) =>
      tursoStorageAPI.setStreamUrl(magnetLink, streamData),
    getStreamUrl: (magnetLink: string) =>
      tursoStorageAPI.getStreamUrl(magnetLink),
    deleteStreamUrl: (magnetLink: string) =>
      tursoStorageAPI.deleteStreamUrl(magnetLink),
    addFavorite: (torrent: any, coverImageUrl?: string) => tursoStorageAPI.addFavorite(torrent, coverImageUrl),
    getFavorites: () => tursoStorageAPI.getFavorites(),
  };
}

export default tursoStorageAPI;

// Maintain backward compatibility
export const sqliteCacheAPI = tursoStorageAPI;
