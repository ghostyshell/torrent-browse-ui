import { Torrent } from '../types/Torrent';
import { getAuthHeaders } from './authSession';
import { backendUrl } from '../config/env';

export interface FavoriteTorrent extends Torrent {
  dateAdded: string;
  favoriteEntryId?: string;
}

export interface FavoriteEntry {
  id: string;
  torrentKey: string;
  torrentData: Torrent;
  magnetLink?: string;
  torrentName: string;
  createdAt: number;
  updatedAt: number;
}

class FavoritesService {
  private readonly BACKEND_URL = backendUrl;

  // New methods for backend API
  private async fetchFromBackend(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    try {
      const headers: HeadersInit = getAuthHeaders({
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      });

      const response = await fetch(`${this.BACKEND_URL}${endpoint}`, {
        credentials: 'include',
        headers,
        ...options,
      });

      if (!response.ok) {
        // If unauthorized, it might mean user needs to log in
        if (response.status === 401) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Backend API error handled
      return null;
    }
  }

  async getFavoritesFromBackend(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    favorites: FavoriteTorrent[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    try {
      const response = await this.fetchFromBackend(
        `/api/storage/favorites?page=${page}&limit=${limit}`
      );
      if (response?.success && response.favorites) {
        return {
          favorites: response.favorites.map((fav: any) => {
            // Restore cached link properties if this was originally a cached link
            const restoredFav = {
              ...fav,
              favoriteEntryId: fav.favoriteEntryId,
            };

            // Check if this is a cached link by looking at the Source or other indicators
            if (
              fav.Source === 'cached-links' ||
              fav.isCachedLink ||
              fav.cachedLinkId
            ) {
              restoredFav.isCachedLink = true;
              restoredFav.cachedLinkId =
                fav.cachedLinkId || fav.Hash || fav.favoriteEntryId;
            }

            return restoredFav;
          }),
          pagination: response.pagination,
        };
      }
      return {
        favorites: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          limit,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    } catch (error) {
      // Failed to fetch favorites from backend
      return {
        favorites: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          limit,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  }

  async addToBackend(
    torrent: Torrent,
    coverImageUrl?: string
  ): Promise<FavoriteEntry | null> {
    try {
      const response = await this.fetchFromBackend('/api/storage/favorites', {
        method: 'POST',
        body: JSON.stringify({ torrent, coverImageUrl }),
      });

      if (response?.success && response.favoriteEntry) {
        return response.favoriteEntry;
      }
      return null;
    } catch (error) {
      // Failed to add favorite to backend
      return null;
    }
  }

  async removeFromBackend(
    torrent: Torrent,
    favoriteEntryId?: string
  ): Promise<boolean> {
    try {
      const response = await this.fetchFromBackend('/api/storage/favorites', {
        method: 'DELETE',
        body: JSON.stringify({
          torrent: favoriteEntryId ? undefined : torrent,
          favoriteEntryId,
        }),
      });

      return response?.success || false;
    } catch (error) {
      // Failed to remove favorite from backend
      return false;
    }
  }

  async getFavoriteEntry(torrent: Torrent): Promise<FavoriteEntry | null> {
    try {
      const response = await this.fetchFromBackend('/api/favorites/check', {
        method: 'POST',
        body: JSON.stringify({ torrent }),
      });

      if (response?.success && response.favoriteEntry) {
        return response.favoriteEntry;
      }
      return null;
    } catch (error) {
      // Failed to get favorite entry
      return null;
    }
  }

  async getFavorites(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    favorites: FavoriteTorrent[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    return await this.getFavoritesFromBackend(page, limit);
  }

  async getAllFavorites(): Promise<FavoriteTorrent[]> {
    // Get all favorites without pagination for operations like add/remove
    // Note: This should be avoided where possible - use paginated methods instead
    const result = await this.getFavoritesFromBackend(1, 10000); // Large limit to get all
    return result.favorites;
  }

  // Synchronous version for immediate UI updates - now returns empty array since we're backend-only
  getFavoritesSync(): FavoriteTorrent[] {
    // Backend-only mode, return empty array for sync calls
    return [];
  }

  private isTorrentDuplicate(
    torrent: Torrent,
    favorites: FavoriteTorrent[]
  ): boolean {
    return favorites.some((fav) => {
      if (
        torrent.isCachedLink &&
        torrent.cachedLinkId &&
        fav.isCachedLink &&
        fav.cachedLinkId
      ) {
        return fav.cachedLinkId === torrent.cachedLinkId;
      }

      return (
        fav.Magnet === torrent.Magnet ||
        (fav.Name === torrent.Name && fav.Size === torrent.Size)
      );
    });
  }

  async addToFavorites(
    torrent: Torrent,
    coverImageUrl?: string
  ): Promise<boolean> {
    try {
      // Check if favorite already exists using the more efficient isFavorite method
      const alreadyExists = await this.isFavorite(torrent);

      if (alreadyExists) {
        return false;
      }

      // For 1337x torrents without a magnet link, fetch details first to get the magnet
      let enrichedTorrent = torrent;
      if (
        torrent.Source?.toLowerCase() === '1337x' &&
        !torrent.Magnet &&
        torrent.Url
      ) {
        try {
          const { torrentApi } = await import('./torrentApi');
          const details = await torrentApi.getTorrentDetails('1337x', torrent.Url);
          if (details.magnet) {
            enrichedTorrent = { ...torrent, Magnet: details.magnet };
            console.log('[Favorites] Fetched magnet link for 1337x torrent:', details.magnet.substring(0, 50) + '...');
          } else {
            console.warn('[Favorites] Could not fetch magnet link for 1337x torrent');
          }
        } catch (error) {
          console.error('[Favorites] Error fetching 1337x torrent details:', error);
          // Continue adding without magnet - user can still view details
        }
      }

      // If no coverImageUrl provided, check if there's already a cover image for this torrent
      // This handles the case where user set cover from description images before adding to favorites
      if (!coverImageUrl) {
        try {
          // Import cover image service dynamically to avoid circular imports
          const { enhancedCoverImageService } = await import(
            './enhancedCoverImageService'
          );

          // Use the specific migration method that checks by torrentKey (not favoriteEntryId)
          const existingCoverImage =
            await enhancedCoverImageService.getExistingCoverImageForMigration(
              enrichedTorrent
            );
          if (existingCoverImage) {
            coverImageUrl = existingCoverImage;
          }
        } catch (error) {
          // Could not check for existing cover image
        }
      }

      const favoriteEntry = await this.addToBackend(enrichedTorrent, coverImageUrl);
      const success = favoriteEntry !== null;

      if (success) {
        this.invalidateCountCache();
      }

      return success;
    } catch (error) {
      return false;
    }
  }

  // Synchronous version for immediate UI updates - now just triggers async backend call
  addToFavoritesSync(torrent: Torrent, coverImageUrl?: string): boolean {
    // Trigger async backend call without waiting (includes cover image migration)
    this.addToFavorites(torrent, coverImageUrl);
    // Optimistically invalidate cache since we expect this to succeed
    this.invalidateCountCache();
    return true; // Optimistic return for UI feedback
  }

  async removeFromFavorites(torrent: Torrent): Promise<boolean> {
    try {
      // Get the specific favorite entry to obtain the entry ID
      const favoriteEntry = await this.getFavoriteEntry(torrent);
      const favoriteEntryId = favoriteEntry?.id;

      const success = await this.removeFromBackend(torrent, favoriteEntryId);

      if (success) {
        this.invalidateCountCache();
      }

      return success;
    } catch (error) {
      return false;
    }
  }

  // Synchronous version for immediate UI updates - now just triggers async backend call
  removeFromFavoritesSync(torrent: Torrent): boolean {
    // Trigger async backend call without waiting
    this.removeFromFavorites(torrent);
    // Optimistically invalidate cache since we expect this to succeed
    this.invalidateCountCache();
    return true; // Optimistic return for UI feedback
  }

  async isFavorite(torrent: Torrent): Promise<boolean> {
    try {
      const favoriteEntry = await this.getFavoriteEntry(torrent);
      return favoriteEntry !== null;
    } catch (error) {
      return false;
    }
  }

  // Synchronous version - uses localStorage for immediate UI feedback
  isFavoriteSync(torrent: Torrent): boolean {
    // For cached links, we need to check if they have the favorite flag
    if (torrent.isCachedLink) {
      // Check if this cached link was marked as favorite in localStorage temporarily
      try {
        const tempFavorites = localStorage.getItem(
          'temp_cached_link_favorites'
        );

        if (tempFavorites) {
          const favorites = JSON.parse(tempFavorites);
          const isFav = favorites.includes(torrent.cachedLinkId);
          return isFav;
        }
      } catch (error) {
        // Error reading temp favorites
      }
    }

    // For regular torrents, check temporary localStorage storage
    try {
      const tempFavorites = localStorage.getItem('temp_regular_favorites');
      if (tempFavorites) {
        const favorites = JSON.parse(tempFavorites);
        // Use magnet link as the key for regular torrents
        const torrentKey = torrent.Magnet || `${torrent.Name}_${torrent.Size}`;
        return favorites.includes(torrentKey);
      }
    } catch (error) {
      // Error reading temp regular favorites
    }

    return false;
  }

  async toggleFavorite(torrent: Torrent): Promise<boolean> {
    return (await this.isFavorite(torrent))
      ? await this.removeFromFavorites(torrent)
      : await this.addToFavorites(torrent);
  }

  // Synchronous version for immediate UI feedback
  toggleFavoriteSync(torrent: Torrent, coverImageUrl?: string): boolean {
    const wasAlreadyFavorite = this.isFavoriteSync(torrent);

    if (torrent.isCachedLink && torrent.cachedLinkId) {
      // Handle cached links with temporary localStorage storage
      try {
        const tempFavorites = localStorage.getItem(
          'temp_cached_link_favorites'
        );
        let favorites = tempFavorites ? JSON.parse(tempFavorites) : [];

        if (wasAlreadyFavorite) {
          // Remove from favorites
          favorites = favorites.filter(
            (id: string) => id !== torrent.cachedLinkId
          );
          this.removeFromFavoritesSync(torrent);
        } else {
          // Add to favorites
          if (!favorites.includes(torrent.cachedLinkId)) {
            favorites.push(torrent.cachedLinkId);
          }
          this.addToFavoritesSync(torrent, coverImageUrl);
        }

        localStorage.setItem(
          'temp_cached_link_favorites',
          JSON.stringify(favorites)
        );

        // Dispatch custom event to notify components
        window.dispatchEvent(new CustomEvent('favorites-updated'));

        return true;
      } catch (error) {
        return false;
      }
    }

    // For regular torrents, handle with temporary localStorage storage
    try {
      const tempFavorites = localStorage.getItem('temp_regular_favorites');
      let favorites = tempFavorites ? JSON.parse(tempFavorites) : [];
      const torrentKey = torrent.Magnet || `${torrent.Name}_${torrent.Size}`;

      if (wasAlreadyFavorite) {
        // Remove from favorites
        favorites = favorites.filter((key: string) => key !== torrentKey);
        this.removeFromFavoritesSync(torrent);
      } else {
        // Add to favorites
        if (!favorites.includes(torrentKey)) {
          favorites.push(torrentKey);
        }
        this.addToFavoritesSync(torrent);
      }

      localStorage.setItem('temp_regular_favorites', JSON.stringify(favorites));

      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('favorites-updated'));

      return true;
    } catch (error) {
      return false;
    }
  }

  private cachedCount: number | null = null;
  private countCacheTime: number = 0;
  private readonly COUNT_CACHE_DURATION = 30000; // Cache for 30 seconds

  async getFavoritesCount(): Promise<number> {
    const now = Date.now();

    // Return cached count if it's still valid
    if (
      this.cachedCount !== null &&
      now - this.countCacheTime < this.COUNT_CACHE_DURATION
    ) {
      return this.cachedCount;
    }

    try {
      const response = await this.fetchFromBackend(
        '/api/storage/favorites?page=1&limit=1'
      );
      if (response?.success && response.pagination) {
        this.cachedCount = response.pagination.totalCount;
        this.countCacheTime = now;
        return response.pagination.totalCount;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  // Method to invalidate count cache when favorites change
  private invalidateCountCache(): void {
    this.cachedCount = null;
    this.countCacheTime = 0;
  }

  // Method to clear all cached data when user logs out
  clearUserData(): void {
    this.invalidateCountCache();
    // Clear localStorage temporary data
    localStorage.removeItem('temp_cached_link_favorites');
    localStorage.removeItem('temp_regular_favorites');
  }

  // Method to sync favorites from backend to localStorage for immediate UI feedback
  async syncFavoritesToLocalStorage(): Promise<void> {
    try {
      // Get all favorites from backend (with a large limit to get all)
      const result = await this.getFavoritesFromBackend(1, 10000);
      const favorites = result.favorites;

      // Separate regular torrents and cached links
      const regularTorrentKeys: string[] = [];
      const cachedLinkIds: string[] = [];

      favorites.forEach((fav) => {
        if (fav.isCachedLink && fav.cachedLinkId) {
          cachedLinkIds.push(fav.cachedLinkId);
        } else {
          // Use magnet link as key for regular torrents
          const torrentKey = fav.Magnet || `${fav.Name}_${fav.Size}`;
          regularTorrentKeys.push(torrentKey);
        }
      });

      // Update localStorage
      localStorage.setItem(
        'temp_cached_link_favorites',
        JSON.stringify(cachedLinkIds)
      );
      localStorage.setItem(
        'temp_regular_favorites',
        JSON.stringify(regularTorrentKeys)
      );

      // Dispatch custom event to notify components about localStorage changes
      window.dispatchEvent(new CustomEvent('favorites-updated'));
    } catch (error) {
      // Failed to sync favorites to localStorage
    }
  }

  // New methods for working with the backend system
  async getTorrentDetails(
    favoriteEntryId: string,
    source?: string
  ): Promise<any> {
    try {
      const endpoint = source
        ? `/api/favorites/${favoriteEntryId}/details?source=${encodeURIComponent(
            source
          )}`
        : `/api/favorites/${favoriteEntryId}/details`;

      const response = await this.fetchFromBackend(endpoint);
      return response?.success ? response.details : null;
    } catch (error) {
      // Failed to get torrent details
      return null;
    }
  }

  async setTorrentDetails(
    favoriteEntryId: string,
    source: string,
    detailsData: any
  ): Promise<boolean> {
    try {
      const response = await this.fetchFromBackend(
        `/api/favorites/${favoriteEntryId}/details`,
        {
          method: 'POST',
          body: JSON.stringify({ source, detailsData }),
        }
      );

      return response?.success || false;
    } catch (error) {
      // Failed to set torrent details
      return false;
    }
  }

  async updateMagnetLink(
    favoriteEntryId: string,
    magnetLink: string
  ): Promise<boolean> {
    try {
      const response = await this.fetchFromBackend(
        `/api/storage/favorites/${favoriteEntryId}/magnet`,
        {
          method: 'PUT',
          body: JSON.stringify({ magnetLink }),
        }
      );

      return response?.success || false;
    } catch (error) {
      console.error('[Favorites] Failed to update magnet link:', error);
      return false;
    }
  }
}

export const favoritesService = new FavoritesService();
