import { useState, useEffect, useRef } from 'react';
import { realDebridService } from '../services/realDebridService';

// Global cache to prevent redundant API calls across components
const cacheStatusCache = new Map<string, {
  hasCachedStreamUrl: boolean;
  isStreamUrlExpired: boolean;
  timestamp: number;
  loading: boolean;
}>();

const CACHE_EXPIRY_MS = 5000; // 5 seconds cache - reduced for faster UI updates after background refresh
const pendingRequests = new Map<string, Promise<void>>();

/**
 * Invalidate cached status for a specific magnet link
 * This forces the hook to re-check the cache status on next render
 */
export const invalidateCacheStatus = (magnetLink: string): void => {
  // Extract hash from magnet link for cache key
  const match = magnetLink.match(/xt=urn:btih:([a-fA-F0-9]{40})/);
  const key = match ? match[1].toLowerCase() : magnetLink;

  cacheStatusCache.delete(key);
  cacheStatusCache.delete(magnetLink); // Also try full magnet as key
};

/**
 * Invalidate all cached status entries
 * Useful after bulk operations like refreshing all stream URLs
 */
export const invalidateAllCacheStatus = (): void => {
  cacheStatusCache.clear();
};

/**
 * Hook to track cache status for a torrent and trigger re-renders when cache changes
 * Optimized to prevent redundant API calls once data is loaded
 */
export const useCacheStatus = (
  magnetLink: string | undefined,
  refreshTrigger?: any
) => {
  const [hasCachedStreamUrl, setHasCachedStreamUrl] = useState(false);
  const [isStreamUrlExpired, setIsStreamUrlExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!magnetLink || !mountedRef.current) {
      setHasCachedStreamUrl(false);
      setIsStreamUrlExpired(false);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = cacheStatusCache.get(magnetLink);
    const now = Date.now();

    // If we have recent cached data, use it
    if (cached && (now - cached.timestamp) < CACHE_EXPIRY_MS) {
      if (mountedRef.current) {
        setHasCachedStreamUrl(cached.hasCachedStreamUrl);
        setIsStreamUrlExpired(cached.isStreamUrlExpired);
        setIsLoading(cached.loading);
      }
      return;
    }

    // If there's already a pending request for this magnet link, wait for it
    const existingRequest = pendingRequests.get(magnetLink);
    if (existingRequest) {
      existingRequest.then(() => {
        if (mountedRef.current) {
          const updatedCache = cacheStatusCache.get(magnetLink);
          if (updatedCache) {
            setHasCachedStreamUrl(updatedCache.hasCachedStreamUrl);
            setIsStreamUrlExpired(updatedCache.isStreamUrlExpired);
            setIsLoading(false);
          }
        }
      }).catch(() => {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      });
      return;
    }

    // Check current cache status
    const updateCacheStatus = async () => {
      if (!mountedRef.current) return;

      setIsLoading(true);

      // Mark as loading in cache
      cacheStatusCache.set(magnetLink, {
        hasCachedStreamUrl: cached?.hasCachedStreamUrl || false,
        isStreamUrlExpired: cached?.isStreamUrlExpired || false,
        timestamp: now,
        loading: true
      });

      try {
        // Check both localStorage and Turso backend for stream URLs with timestamp
        const cachedData = await realDebridService.getCachedStreamUrlWithTimestamp(magnetLink);
        const streamCached = !!cachedData;

        // Check if the cached stream URL is expired
        const isExpired = streamCached && cachedData
          ? realDebridService.isCachedStreamUrlExpired(cachedData.timestamp)
          : false;

        if (mountedRef.current) {
          const result = {
            hasCachedStreamUrl: streamCached,
            isStreamUrlExpired: isExpired,
            timestamp: Date.now(),
            loading: false
          };

          // Update cache
          cacheStatusCache.set(magnetLink, result);

          // Update state
          setHasCachedStreamUrl(streamCached);
          setIsStreamUrlExpired(isExpired);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('Failed to check cache status for', magnetLink, error);
        if (mountedRef.current) {
          setIsLoading(false);
          // Keep previous values or set to false
          const result = {
            hasCachedStreamUrl: cached?.hasCachedStreamUrl || false,
            isStreamUrlExpired: cached?.isStreamUrlExpired || false,
            timestamp: Date.now(),
            loading: false
          };
          cacheStatusCache.set(magnetLink, result);
        }
      }
    };

    const request = updateCacheStatus();
    pendingRequests.set(magnetLink, request);

    request.finally(() => {
      pendingRequests.delete(magnetLink);
    });

  }, [magnetLink, refreshTrigger]);

  return {
    hasCachedStreamUrl,
    isStreamUrlExpired,
    isLoading,
  };
};
