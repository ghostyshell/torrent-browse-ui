import { storageConfig } from '../utils/storageConfig';
import { getAuthHeaders } from './authSession';
import { backendUrl } from '../config/env';

export interface StoredLink {
  id: string;
  url: string;
  title?: string;
  dateAdded: string;
  streamUrl?: string;
  streamUrlCachedAt?: string; // When the stream URL was cached
  isStreaming?: boolean;
  error?: string;
  supportsRangeRequests?: boolean;
  filename?: string;
}

class StoredLinksService {
  private readonly STORAGE_KEY = 'stored_links';
  private readonly BACKEND_URL = backendUrl;

  private getAuthHeaders(): HeadersInit {
    return getAuthHeaders({ 'Content-Type': 'application/json' });
  }

  private fetchOptions(options: RequestInit = {}): RequestInit {
    return {
      credentials: 'include',
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };
  }

  // Use storage configuration instead of hardcoded values
  private get USE_BACKEND_FIRST(): boolean {
    return storageConfig.shouldUseBackendFirst();
  }

  private get BACKEND_ONLY(): boolean {
    return storageConfig.isBackendOnly();
  }

  private get HAS_LOCALSTORAGE_FALLBACK(): boolean {
    return storageConfig.hasLocalStorageFallback();
  }

  // Get all cached links (backend-first with localStorage fallback based on config)
  async getStoredLinks(
    page?: number,
    limit?: number
  ): Promise<StoredLink[] | { storedLinks: StoredLink[]; pagination: any }> {
    if (this.USE_BACKEND_FIRST) {
      try {
        // Build URL with pagination parameters if provided
        const url = new URL(`${this.BACKEND_URL}/api/storage/stored-links`);
        if (page !== undefined && limit !== undefined) {
          url.searchParams.set('page', page.toString());
          url.searchParams.set('limit', limit.toString());
        }

        const response = await fetch(url.toString(), this.fetchOptions());
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.storedLinks) {
            // Only update localStorage if fallback is enabled and not in backend-only mode
            if (this.HAS_LOCALSTORAGE_FALLBACK && !this.BACKEND_ONLY) {
              try {
                localStorage.setItem(
                  this.STORAGE_KEY,
                  JSON.stringify(data.storedLinks)
                );
              } catch (quotaError) {
                if (
                  quotaError instanceof Error &&
                  quotaError.name === 'QuotaExceededError'
                ) {
                  console.warn(
                    'localStorage quota exceeded, skipping cache storage:',
                    quotaError
                  );
                  // Try to store a reduced version with only essential fields
                  try {
                    const essentialData = data.storedLinks.map(
                      (link: StoredLink) => ({
                        id: link.id,
                        url: link.url,
                        title: link.title,
                        dateAdded: link.dateAdded,
                        // Skip large fields to save space
                      })
                    );
                    localStorage.setItem(
                      this.STORAGE_KEY,
                      JSON.stringify(essentialData)
                    );
                  } catch (secondaryError) {
                    console.warn(
                      'Failed to store even essential cached links data:',
                      secondaryError
                    );
                    // Clear localStorage cache to prevent corruption
                    try {
                      localStorage.removeItem(this.STORAGE_KEY);
                    } catch (clearError) {
                      console.warn(
                        'Failed to clear corrupted localStorage cache:',
                        clearError
                      );
                    }
                  }
                } else {
                  console.warn(
                    'Failed to store cached links in localStorage:',
                    quotaError
                  );
                }
              }
            }

            // Return paginated response if pagination was requested
            if (page !== undefined && limit !== undefined && data.pagination) {
              return {
                storedLinks: data.storedLinks,
                pagination: data.pagination,
              };
            }

            return data.storedLinks;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch cached links from backend:', error);
        if (this.BACKEND_ONLY) {
          return []; // No fallback in backend-only mode
        }
      }
    }

    // Fallback to localStorage (only if enabled)
    if (this.HAS_LOCALSTORAGE_FALLBACK) {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        const allLinks = stored ? JSON.parse(stored) : [];

        // If pagination was requested, simulate it on localStorage data
        if (page !== undefined && limit !== undefined) {
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedLinks = allLinks.slice(startIndex, endIndex);

          return {
            storedLinks: paginatedLinks,
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(allLinks.length / limit),
              totalCount: allLinks.length,
              limit,
              hasNextPage: endIndex < allLinks.length,
              hasPrevPage: page > 1,
            },
          };
        }

        return allLinks;
      } catch (error) {
        console.error('Failed to parse cached links from localStorage:', error);
        if (page !== undefined && limit !== undefined) {
          return {
            storedLinks: [],
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
        return [];
      }
    }

    if (page !== undefined && limit !== undefined) {
      return {
        storedLinks: [],
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
    return [];
  }

  // Synchronous version for immediate UI updates (localStorage only, respects config)
  getStoredLinksSync(): StoredLink[] {
    if (!this.HAS_LOCALSTORAGE_FALLBACK) {
      return []; // No localStorage access in backend-only mode
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      // Ensure the parsed data is an array
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  // Add a new link to cache (hybrid: backend + localStorage)
  async addStoredLink(url: string, title?: string): Promise<StoredLink> {
    try {
      // First check if already exists (sync version for immediate response)
      const existingLinks = this.getStoredLinksSync();
      const exists = existingLinks.find((link) => link.url === url);
      if (exists) {
        return exists;
      }

      const newStoredLink: StoredLink = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url,
        title: title || this.extractTitleFromUrl(url),
        dateAdded: new Date().toISOString(),
      };

      // Try to add to backend first
      if (this.USE_BACKEND_FIRST) {
        try{
          const response = await fetch(
            `${this.BACKEND_URL}/api/storage/stored-links`,
            this.fetchOptions({
              method: 'POST',
              body: JSON.stringify({
                url: newStoredLink.url,
                title: newStoredLink.title,
              }),
            })
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.cachedLink) {
              // Update localStorage with backend response
              const storedLinks = this.getStoredLinksSync();
              storedLinks.unshift(data.cachedLink);
              localStorage.setItem(
                this.STORAGE_KEY,
                JSON.stringify(storedLinks)
              );
              return data.cachedLink;
            }
          }
        } catch (error) {
          // Failed to add cached link to backend, falling back to localStorage
        }
      }

      // Fallback to localStorage only
      const storedLinks = this.getStoredLinksSync();
      storedLinks.unshift(newStoredLink);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedLinks));

      return newStoredLink;
    } catch (error) {
      console.error('Failed to add cached link:', error);
      throw error;
    }
  }

  // Synchronous version for immediate UI updates
  addStoredLinkSync(url: string, title?: string): StoredLink {
    try {
      const storedLinks = this.getStoredLinksSync();

      // Check if already exists
      const exists = storedLinks.find((link) => link.url === url);
      if (exists) {
        return exists;
      }

      const newStoredLink: StoredLink = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url,
        title: title || this.extractTitleFromUrl(url),
        dateAdded: new Date().toISOString(),
      };

      storedLinks.unshift(newStoredLink);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedLinks));

      // Attempt backend sync in background
      this.syncToBackend(newStoredLink).catch((error) => {
        console.warn('Background sync to backend failed:', error);
      });

      return newStoredLink;
    } catch (error) {
      console.error('Failed to add cached link sync:', error);
      throw error;
    }
  }

  // Remove a link from cache (hybrid: backend + localStorage)
  async removeStoredLink(id: string): Promise<boolean> {
    try {
      // Remove from backend first
      if (this.USE_BACKEND_FIRST) {
        try {
          const response = await fetch(
            `${this.BACKEND_URL}/api/storage/stored-links/${id}`,
            this.fetchOptions({ method: 'DELETE' })
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Also remove from localStorage
              const storedLinks = this.getStoredLinksSync();
              const filteredLinks = storedLinks.filter(
                (link) => link.id !== id
              );
              localStorage.setItem(
                this.STORAGE_KEY,
                JSON.stringify(filteredLinks)
              );
              return true;
            }
          }
        } catch (error) {
          console.warn(
            'Failed to remove cached link from backend, using localStorage:',
            error
          );
        }
      }

      // Fallback to localStorage only
      const storedLinks = this.getStoredLinksSync();
      const initialLength = storedLinks.length;
      const filteredLinks = storedLinks.filter((link) => link.id !== id);

      if (filteredLinks.length < initialLength) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredLinks));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to remove cached link:', error);
      return false;
    }
  }

  // Synchronous version for immediate UI updates
  removeStoredLinkSync(id: string): boolean {
    try {
      const storedLinks = this.getStoredLinksSync();
      const initialLength = storedLinks.length;
      const filteredLinks = storedLinks.filter((link) => link.id !== id);

      if (filteredLinks.length < initialLength) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredLinks));

        // Attempt backend removal in background
        this.removeFromBackend(id).catch((error) => {
          console.warn('Background removal from backend failed:', error);
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to remove cached link sync:', error);
      return false;
    }
  }

  // Update a cached link (hybrid: backend + localStorage)
  async updateStoredLink(
    id: string,
    updates: Partial<StoredLink>
  ): Promise<boolean> {
    try {
      // If updating streamUrl, record the timestamp
      if (updates.streamUrl) {
        const storedLinks = this.getStoredLinksSync();
        const existingLink = storedLinks.find((link) => link.id === id);
        if (existingLink && updates.streamUrl !== existingLink.streamUrl) {
          updates.streamUrlCachedAt = new Date().toISOString();
        }
      }

      // Update in backend first
      if (this.USE_BACKEND_FIRST) {
        try {
          const response = await fetch(
            `${this.BACKEND_URL}/api/storage/stored-links/${id}`,
            this.fetchOptions({
              method: 'PUT',
              body: JSON.stringify(updates),
            })
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Also update localStorage
              const storedLinks = this.getStoredLinksSync();
              const index = storedLinks.findIndex((link) => link.id === id);
              if (index !== -1) {
                storedLinks[index] = { ...storedLinks[index], ...updates };
                localStorage.setItem(
                  this.STORAGE_KEY,
                  JSON.stringify(storedLinks)
                );
              }
              return true;
            }
          }
        } catch (error) {
          console.warn(
            'Failed to update cached link in backend, using localStorage:',
            error
          );
        }
      }

      // Fallback to localStorage only
      const storedLinks = this.getStoredLinksSync();
      const index = storedLinks.findIndex((link) => link.id === id);

      if (index !== -1) {
        storedLinks[index] = { ...storedLinks[index], ...updates };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedLinks));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to update cached link:', error);
      return false;
    }
  }

  // Synchronous version for immediate UI updates
  updateStoredLinkSync(id: string, updates: Partial<StoredLink>): boolean {
    try {
      const storedLinks = this.getStoredLinksSync();
      const index = storedLinks.findIndex((link) => link.id === id);

      if (index !== -1) {
        // If updating streamUrl, record the timestamp
        if (
          updates.streamUrl &&
          updates.streamUrl !== storedLinks[index].streamUrl
        ) {
          updates.streamUrlCachedAt = new Date().toISOString();
        }

        // Ensure error is always a string
        if (updates.error !== undefined) {
          updates.error =
            typeof updates.error === 'string'
              ? updates.error
              : updates.error
              ? String(updates.error)
              : undefined;
        }

        storedLinks[index] = { ...storedLinks[index], ...updates };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedLinks));

        // Attempt backend sync in background
        this.updateInBackend(id, updates).catch((error) => {
          console.warn('Background update in backend failed:', error);
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to update cached link sync:', error);
      return false;
    }
  }

  // Check if a stream URL is likely expired (Real-Debrid URLs typically expire after 4-6 hours)
  isStreamUrlLikelyExpired(link: StoredLink): boolean {
    if (!link.streamUrl || !link.streamUrlCachedAt) {
      return false; // No stream URL or timestamp means it's not expired, just not cached yet
    }

    try {
      const cachedAt = new Date(link.streamUrlCachedAt);
      const now = new Date();
      const hoursSinceCache =
        (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);

      // Real-Debrid URLs typically expire after 4-6 hours
      return hoursSinceCache > 4;
    } catch {
      return true; // If we can't parse the date, assume it's expired
    }
  }

  // Check if a cached link has any issues that need attention
  hasIssues(link: StoredLink): boolean {
    // Has explicit error
    if (link.error) {
      return true;
    }

    // Is a magnet link with expired stream URL
    if (
      link.url.toLowerCase().startsWith('magnet:') &&
      link.streamUrl &&
      this.isStreamUrlLikelyExpired(link)
    ) {
      return true;
    }

    return false;
  }

  // Get cached links count (async version)
  async getStoredLinksCount(): Promise<number> {
    const links = await this.getStoredLinks();
    if (Array.isArray(links)) {
      return links.length;
    } else if (links && Array.isArray(links.storedLinks)) {
      return links.storedLinks.length;
    }
    return 0;
  }

  // Get cached links count (sync version)
  getStoredLinksCountSync(): number {
    return this.getStoredLinksSync().length;
  }

  // Get cached links count from backend without storing in localStorage
  async getStoredLinksCountFromBackend(): Promise<number> {
    if (!this.USE_BACKEND_FIRST) {
      return 0;
    }

    try {
      const response = await fetch(
        `${this.BACKEND_URL}/api/storage/stored-links`,
        this.fetchOptions()
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.storedLinks) {
          return data.storedLinks.length;
        }
      }
      return 0;
    } catch (error) {
      console.warn('Failed to get cached links count from backend:', error);
      return 0;
    }
  }

  // Refresh specific links by force regenerating stream URLs for ALL magnet links
  async refreshExpiredStreamUrls(linksToRefresh?: StoredLink[]): Promise<{
    refreshed: number;
    total: number;
    failed: number;
    skipped: number;
  }> {
    // If specific links are provided, use them; otherwise get all links
    let links: StoredLink[];
    if (linksToRefresh) {
      links = linksToRefresh;
    } else {
      const response = await this.getStoredLinks();
      links = Array.isArray(response) ? response : response.storedLinks;
    }

    let refreshed = 0;
    let failed = 0;
    let skipped = 0;

    // Import realDebridService dynamically to avoid circular dependency
    const { realDebridService } = await import('./realDebridService');

    for (const link of links) {
      // Process ALL magnet links, regardless of whether they have a cached stream URL or if it's expired
      if (link.url.toLowerCase().startsWith('magnet:')) {
        try {
          // Generate fresh stream URL with forceRefresh: true
          // This will bypass ALL caches (localStorage + SQLite backend) and call Real-Debrid
          const streamResult = await realDebridService.getStreamableVideoUrl(link.url, true);

          // Update the cached link with fresh stream URL
          await this.updateStoredLink(link.id, {
            streamUrl: streamResult.streamUrl,
            streamUrlCachedAt: new Date().toISOString(),
            isStreaming: true,
            error: undefined,
            supportsRangeRequests: streamResult.supportsRangeRequests,
            filename: streamResult.filename,
          });

          refreshed++;
        } catch (error: any) {
          failed++;

          // Update with error message
          await this.updateStoredLink(link.id, {
            error: error.message || 'Failed to refresh stream URL',
          });
        }
      } else {
        // Non-magnet links are skipped
        skipped++;
      }
    }

    return { refreshed, total: links.length, failed, skipped };
  }

  // Debug utility to analyze cached links health
  async analyzeStoredLinksHealth(): Promise<{
    total: number;
    healthy: number;
    withErrors: number;
    expired: number;
    magnetLinks: number;
    webLinks: number;
    details: Array<{
      id: string;
      title: string;
      type: 'magnet' | 'web';
      hasError: boolean;
      isExpired: boolean;
      status: string;
    }>;
  }> {
    const response = await this.getStoredLinks();
    const links = Array.isArray(response) ? response : response.storedLinks;
    const analysis = {
      total: links.length,
      healthy: 0,
      withErrors: 0,
      expired: 0,
      magnetLinks: 0,
      webLinks: 0,
      details: [] as Array<{
        id: string;
        title: string;
        type: 'magnet' | 'web';
        hasError: boolean;
        isExpired: boolean;
        status: string;
      }>,
    };

    for (const link of links) {
      const isMagnet = link.url.toLowerCase().startsWith('magnet:');
      const hasError = !!link.error;
      const isExpired = !!(
        link.streamUrl && this.isStreamUrlLikelyExpired(link)
      );

      if (isMagnet) analysis.magnetLinks++;
      else analysis.webLinks++;

      if (hasError) analysis.withErrors++;
      if (isExpired) analysis.expired++;
      if (!hasError && !isExpired) analysis.healthy++;

      let status = 'Healthy';
      if (hasError) status = 'Error';
      else if (isExpired) status = 'Expired Stream URL';
      else if (isMagnet && !link.streamUrl) status = 'Ready to Stream';

      analysis.details.push({
        id: link.id,
        title: link.title || 'Untitled',
        type: isMagnet ? 'magnet' : 'web',
        hasError,
        isExpired,
        status,
      });
    }

    return analysis;
  }

  // === BACKEND HELPER METHODS ===

  // Background sync to backend
  private async syncToBackend(cachedLink: StoredLink): Promise<void> {
    try {
      await fetch(
        `${this.BACKEND_URL}/api/storage/stored-links`,
        this.fetchOptions({
          method: 'POST',
          body: JSON.stringify({
            url: cachedLink.url,
            title: cachedLink.title,
            streamUrl: cachedLink.streamUrl,
            streamUrlCachedAt: cachedLink.streamUrlCachedAt,
            isStreaming: cachedLink.isStreaming,
            error: cachedLink.error,
            supportsRangeRequests: cachedLink.supportsRangeRequests,
            filename: cachedLink.filename,
          }),
        })
      );
    } catch (error) {
      // Silent fail for background sync
      console.debug('Background sync failed:', error);
    }
  }

  // Background removal from backend
  private async removeFromBackend(id: string): Promise<void> {
    try {
      await fetch(
        `${this.BACKEND_URL}/api/storage/stored-links/${id}`,
        this.fetchOptions({ method: 'DELETE' })
      );
    } catch (error) {
      // Silent fail for background removal
      console.debug('Background removal failed:', error);
    }
  }

  // Background update in backend
  private async updateInBackend(
    id: string,
    updates: Partial<StoredLink>
  ): Promise<void> {
    try {
      await fetch(
        `${this.BACKEND_URL}/api/storage/stored-links/${id}`,
        this.fetchOptions({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    } catch (error) {
      // Silent fail for background update
      console.debug('Background update failed:', error);
    }
  }

  // Extract title from URL
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;

      if (path && path !== '/') {
        const pathParts = path.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart) {
          return `${hostname}/${lastPart}`;
        }
      }

      return hostname;
    } catch {
      return 'Cached Link';
    }
  }
}

export const storedLinksService = new StoredLinksService();
