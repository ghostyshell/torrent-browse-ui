/**
 * UNIVERSAL SYNC UTILITY
 *
 * Utilities to ensure synced data is available across all browser sessions
 * by prioritizing backend storage over localStorage
 */

import { storageConfig } from './storageConfig';
import { favoritesService } from '../services/favoritesService';
import { storedLinksService } from '../services/storedLinksService';
import { enhancedCoverImageService } from '../services/enhancedCoverImageService';
import { streamUrlCache } from './streamUrlCache';

interface SyncResult {
  success: boolean;
  syncedItems: number;
  errors: string[];
  type: 'favorites' | 'cachedLinks' | 'coverImages' | 'streamUrls' | 'all';
}

class UniversalSyncUtility {
  /**
   * Ensure all data is synced to backend for universal access
   */
  async syncAllDataToBackend(): Promise<{
    favorites: SyncResult;
    cachedLinks: SyncResult;
    coverImages: SyncResult;
    streamUrls: SyncResult;
    overall: { success: boolean; totalSynced: number; totalErrors: number };
  }> {

    const favoritesResult = await this.syncFavoritesToBackend();
    const cachedLinksResult = await this.syncCachedLinksToBackend();
    const coverImagesResult = await this.syncCoverImagesToBackend();
    const streamUrlsResult = await this.syncStreamUrlsToBackend();

    const totalSynced =
      favoritesResult.syncedItems +
      cachedLinksResult.syncedItems +
      coverImagesResult.syncedItems +
      streamUrlsResult.syncedItems;
    const totalErrors =
      favoritesResult.errors.length +
      cachedLinksResult.errors.length +
      coverImagesResult.errors.length +
      streamUrlsResult.errors.length;
    const overallSuccess =
      favoritesResult.success &&
      cachedLinksResult.success &&
      coverImagesResult.success &&
      streamUrlsResult.success;

    // Enable universal sync mode if sync was successful
    if (overallSuccess && totalSynced > 0) {
      storageConfig.enableUniversalBackendSyncMode();
    }

    return {
      favorites: favoritesResult,
      cachedLinks: cachedLinksResult,
      coverImages: coverImagesResult,
      streamUrls: streamUrlsResult,
      overall: {
        success: overallSuccess,
        totalSynced,
        totalErrors,
      },
    };
  }

  /**
   * Sync favorites from backend (no local storage sync needed)
   */
  private async syncFavoritesToBackend(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      errors: [],
      type: 'favorites',
    };

    try {
      // Get favorites from backend only
      const backendResult = await favoritesService.getFavoritesFromBackend();
      result.syncedItems = backendResult.favorites.length;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Error accessing backend favorites: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      console.error('❌ Error accessing backend favorites:', error);
      return result;
    }
  }

  /**
   * Sync cached links from backend (no local storage sync needed)
   */
  async syncCachedLinksToBackend(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      errors: [],
      type: 'cachedLinks',
    };

    try {
      // Get cached links from backend only
      const backendLinks = await storedLinksService.getCachedLinks();
      result.syncedItems = backendLinks.length;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Error accessing backend cached links: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      console.error('❌ Error accessing backend cached links:', error);
      return result;
    }
  }

  /**
   * Sync cover images to backend for favorites
   */
  async syncCoverImagesToBackend(): Promise<SyncResult> {
    const syncResult: SyncResult = {
      success: false,
      syncedItems: 0,
      errors: [],
      type: 'coverImages',
    };

    try {
      // Get current favorites from storage
      const storedFavorites = await favoritesService.getAllFavorites();

      if (storedFavorites.length === 0) {

        syncResult.success = true; // No error, just nothing to sync
        return syncResult;
      }

      // Use existing sync method with progress callback
      const result = await enhancedCoverImageService.syncFavoritesCoverImages(
        storedFavorites,
        (current, total, torrentName) => {

        }
      );

      syncResult.syncedItems = result.synced;
      syncResult.success = result.synced > 0 || result.failed === 0;

      if (result.failed > 0) {
        syncResult.errors.push(`${result.failed} cover images failed to sync`);
      }

      // Clear failed requests cache after successful sync
      // This ensures that cover images can be loaded from backend in fresh browser sessions
      if (result.synced > 0) {
        enhancedCoverImageService.clearFailedRequestsCache();

      }

    } catch (error: any) {
      console.error('📷 [Cover Images Sync] Error:', error);
      syncResult.errors.push(
        error.message || 'Unknown error during cover images sync'
      );
    }

    return syncResult;
  }

  /**
   * Sync stream URLs from backend (no local storage sync needed)
   */
  private async syncStreamUrlsToBackend(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      errors: [],
      type: 'streamUrls',
    };

    try {
      // Stream URLs are managed by backend-only cache now

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Error accessing backend stream URLs: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      console.error('❌ Error accessing backend stream URLs:', error);
      return result;
    }
  }

  /**
   * Force refresh all data from backend (useful when switching devices/browsers)
   */
  async refreshAllDataFromBackend(): Promise<void> {

    try {
      // Clear failed requests cache to enable fresh backend requests for cover images
      enhancedCoverImageService.clearFailedRequestsCache();

      // Force refresh favorites from backend
      await favoritesService.getAllFavorites();

      // Force refresh cached links from backend
      await storedLinksService.getCachedLinks();

      // Stream URLs are automatically loaded from backend when localStorage is missing
      // via the StreamUrlCache.get() method - no explicit refresh needed

    } catch (error) {
      console.error('❌ Error refreshing data from backend:', error);
      throw error;
    }
  }

  /**
   * Check if universal sync is currently active
   */
  isUniversalSyncActive(): boolean {
    const config = storageConfig.getConfig();
    return (
      config.useBackendFirst && !config.backendOnly && config.backgroundSync
    );
  }

  /**
   * Force reload cover images from backend (useful for testing)
   * This clears the failed requests cache and forces fresh backend requests
   */
  async forceReloadCoverImagesFromBackend(): Promise<{
    cleared: boolean;
    message: string;
  }> {
    try {
      // Clear the failed requests cache to allow backend requests
      enhancedCoverImageService.clearFailedRequestsCache();

      return {
        cleared: true,
        message:
          'Failed requests cache cleared. Cover images will now load from backend in fresh browser sessions.',
      };
    } catch (error: any) {
      console.error('🔄 [Force Reload] Error:', error);
      return {
        cleared: false,
        message: `Error clearing cache: ${error.message}`,
      };
    }
  }

  /**
   * Check cover image status and load them from backend for current favorites
   * This is especially useful in fresh browser sessions or incognito mode
   */
  async refreshCoverImagesFromBackend(): Promise<{
    success: boolean;
    loaded: number;
    failed: number;
    total: number;
    message: string;
  }> {

    try {
      // Get current favorites
      const favorites = await favoritesService.getAllFavorites();

      if (favorites.length === 0) {
        return {
          success: true,
          loaded: 0,
          failed: 0,
          total: 0,
          message: 'No favorites found to load cover images for',
        };
      }

      // Clear failed requests cache to enable fresh requests
      enhancedCoverImageService.clearFailedRequestsCache();

      let loaded = 0;
      let failed = 0;

      // Try to load cover images for each favorite
      for (let i = 0; i < favorites.length; i++) {
        const favorite = favorites[i];

        try {
          const coverImage = await enhancedCoverImageService.getCoverImage(
            favorite
          );
          if (coverImage) {
            loaded++;

          } else {
            failed++;

          }
        } catch (error: any) {
          failed++;
          console.warn(
            `⚠️ [Cover Images] Error loading cover for "${favorite.Name}":`,
            error.message
          );
        }

        // Small delay to prevent overwhelming the backend
        if (i < favorites.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      const message = `Cover images loading completed: ${loaded} loaded, ${failed} failed out of ${favorites.length} total favorites`;

      return {
        success: loaded > 0 || failed === 0,
        loaded,
        failed,
        total: favorites.length,
        message,
      };
    } catch (error: any) {
      const errorMessage = `Error during cover images refresh: ${error.message}`;
      console.error('🖼️ [Cover Images] Error:', error);
      return {
        success: false,
        loaded: 0,
        failed: 0,
        total: 0,
        message: errorMessage,
      };
    }
  }

  /**
   * Force refresh stream URLs from backend (useful when localStorage is cleared)
   * This method helps preload stream URLs that are available in Turso backend
   */
  async refreshStreamUrlsFromBackend(): Promise<{
    success: boolean;
    loaded: number;
    total: number;
    message: string;
  }> {

    try {
      // Note: Stream URLs in the StreamUrlCache are automatically loaded from backend
      // when not found in localStorage via the get() method. There's no central registry
      // of all stream URLs like there is for favorites, so we can only load them on-demand.

      return {
        success: true,
        loaded: 0,
        total: 0,
        message:
          'Stream URLs are loaded on-demand from backend. Use force refresh in BatchCacheProcessor for specific torrents.',
      };
    } catch (error: any) {
      const errorMessage = `Error during stream URLs refresh: ${error.message}`;
      console.error('🎬 [Stream URLs] Error:', error);
      return {
        success: false,
        loaded: 0,
        total: 0,
        message: errorMessage,
      };
    }
  }

  /**
   * Get current sync status with enhanced information
   */
  getSyncStatus(): {
    isActive: boolean;
    lastSyncTime?: string;
  } {
    return {
      isActive: this.isUniversalSyncActive(),
      lastSyncTime: undefined, // No longer tracking sync time in localStorage
    };
  }
}

// Export singleton instance
export const universalSyncUtility = new UniversalSyncUtility();

// Expose to window for development/debugging
if (process.env.NODE_ENV === 'development') {
  (window as any).universalSync = {
    syncAll: () => universalSyncUtility.syncAllDataToBackend(),
    refreshFromBackend: () => universalSyncUtility.refreshAllDataFromBackend(),
    getStatus: () => universalSyncUtility.getSyncStatus(),
    isActive: () => universalSyncUtility.isUniversalSyncActive(),
    forceReloadCoverImages: () =>
      universalSyncUtility.forceReloadCoverImagesFromBackend(),
    refreshCoverImages: () =>
      universalSyncUtility.refreshCoverImagesFromBackend(),
    refreshStreamUrls: () =>
      universalSyncUtility.refreshStreamUrlsFromBackend(),
    // Debug helpers (backend-only mode)
    checkCoverImages: async () => {
      const result = await favoritesService.getFavoritesFromBackend();

      return {
        favorites: result.favorites.length,
        coverImages: 0, // No longer tracking local cover images
        sampleKeys: [],
      };
    },
    // Debug helper to check cover image status for current favorites
    debugCoverImages: async () => {
      const favorites = await favoritesService.getAllFavorites();
      const covers = enhancedCoverImageService.getAllCovers();
      const failedRequests = enhancedCoverImageService.getFailedRequestsCache();

      // Sample failed requests
      if (failedRequests.length > 0) {

      }

      // Check which favorites have/don't have cover images
      const favoritesWithCovers = favorites.filter((fav) => {
        const key = Object.keys(covers).find(
          (k) => covers[k].torrentName === fav.Name
        );
        return !!key;
      });

      return {
        totalFavorites: favorites.length,
        localCoverImages: Object.keys(covers).length,
        failedRequests: failedRequests.length,
        favoritesWithCovers: favoritesWithCovers.length,
        sampleFailedRequests: failedRequests.slice(0, 5),
      };
    },
  };

}
