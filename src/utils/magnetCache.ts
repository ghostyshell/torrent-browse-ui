/**
 * Magnet Link Cache
 *
 * Stores magnet links fetched from torrent details so they can be
 * used in search result cards without re-fetching.
 *
 * This cache now supports backend persistence via the API.
 */

import apiClient from '../services/apiClient';
import { isAxiosError } from 'axios';

interface MagnetCacheEntry {
  magnet: string;
  timestamp: number;
}

// Cache with URL as key (in-memory cache)
const magnetCache = new Map<string, MagnetCacheEntry>();

// Cache expiry time (24 hours)
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Track pending backend requests to avoid duplicate API calls
const pendingBackendRequests = new Map<string, Promise<string | null>>();

/**
 * Generate a unique key for a torrent
 */
function getTorrentKey(source: string, url: string): string {
  return `${source.toLowerCase()}:${url}`;
}

/**
 * Store a magnet link in the cache
 */
export function cacheMagnet(source: string, url: string, magnet: string): void {
  if (!source || !url || !magnet) return;
  
  const key = getTorrentKey(source, url);
  magnetCache.set(key, {
    magnet,
    timestamp: Date.now(),
  });
  
  // Dispatch event so components can react
  window.dispatchEvent(new CustomEvent('magnet-cached', { 
    detail: { source, url, magnet } 
  }));
}

/**
 * Get a cached magnet link (synchronous - checks memory cache only)
 */
export function getCachedMagnet(source: string, url: string): string | null {
  if (!source || !url) return null;

  const key = getTorrentKey(source, url);
  const entry = magnetCache.get(key);

  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
    magnetCache.delete(key);
    return null;
  }

  return entry.magnet;
}

/**
 * Get a cached magnet link (async - checks memory cache first, then backend)
 */
export async function getCachedMagnetAsync(
  source: string,
  url: string
): Promise<string | null> {
  if (!source || !url) return null;

  // First check memory cache
  const memoryCached = getCachedMagnet(source, url);
  if (memoryCached) {
    return memoryCached;
  }

  // Check if there's already a pending request for this magnet
  const key = getTorrentKey(source, url);
  if (pendingBackendRequests.has(key)) {
    return pendingBackendRequests.get(key)!;
  }

  // Create a new backend request
  const backendRequest = fetchMagnetFromBackend(source, url);
  pendingBackendRequests.set(key, backendRequest);

  try {
    const result = await backendRequest;
    return result;
  } finally {
    // Clean up pending request
    pendingBackendRequests.delete(key);
  }
}

/**
 * Fetch magnet from backend API
 */
async function fetchMagnetFromBackend(
  source: string,
  url: string
): Promise<string | null> {
  try {
    const response = await apiClient.get('/api/cache/magnet', {
      params: { source, url },
      timeout: 5000,
    });

    if (response.data?.success && response.data?.data?.magnet) {
      const magnet = response.data.data.magnet;

      // Cache it in memory for quick access
      const key = getTorrentKey(source, url);
      magnetCache.set(key, {
        magnet,
        timestamp: Date.now(),
      });

      return magnet;
    }

    return null;
  } catch (error) {
    // If backend returns 404, that's expected - magnet not cached yet
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    console.warn('Failed to fetch magnet from backend:', error);
    return null;
  }
}

/**
 * Check if a magnet is cached
 */
export function hasCachedMagnet(source: string, url: string): boolean {
  return getCachedMagnet(source, url) !== null;
}

/**
 * Clear all cached magnets
 */
export function clearMagnetCache(): void {
  magnetCache.clear();
}

export const magnetCacheService = {
  cache: cacheMagnet,
  get: getCachedMagnet,
  getAsync: getCachedMagnetAsync,
  has: hasCachedMagnet,
  clear: clearMagnetCache,
};

