import { useState, useCallback, useRef } from 'react';
import { realDebridService } from '../services/realDebridService';
import { invalidateCacheStatus } from './useCacheStatus';

interface StreamWithCacheState {
  isLoading: boolean;
  error: string | null;
  streamUrl: string | null;
  filename: string | null;
  filesize: number | null;
  supportsRangeRequests: boolean;
  fromCache: boolean;
}

export const useStreamWithCache = () => {
  const [streamingState, setStreamingState] = useState<StreamWithCacheState>({
    isLoading: false,
    error: null,
    streamUrl: null,
    filename: null,
    filesize: null,
    supportsRangeRequests: false,
    fromCache: false,
  });

  // Store the magnet link for potential regeneration
  const currentMagnetLinkRef = useRef<string | null>(null);

  // Start streaming with cache-first approach
  const startStreamingWithCache = useCallback(async (magnetLink: string) => {
    currentMagnetLinkRef.current = magnetLink;

    // Set loading state
    setStreamingState({
      isLoading: true,
      error: null,
      streamUrl: null,
      filename: null,
      filesize: null,
      supportsRangeRequests: false,
      fromCache: false,
    });

    if (!realDebridService.isConfigured()) {
      setStreamingState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          'Real-Debrid API key not configured. Please configure your API key in Account Settings to enable premium streaming.',
      }));
      return;
    }

    // First, check if we have a cached stream URL (checks both localStorage and Turso backend)

    const cachedResult = await realDebridService.getCachedStreamUrl(magnetLink);

    if (cachedResult) {

      setStreamingState({
        isLoading: false,
        error: null,
        streamUrl: cachedResult.streamUrl,
        filename: cachedResult.filename,
        filesize: cachedResult.filesize,
        supportsRangeRequests: cachedResult.supportsRangeRequests || false,
        fromCache: true,
      });
      return;
    }

    // No cached URL found, fetch from Real-Debrid API

    setStreamingState({
      isLoading: true,
      error: null,
      streamUrl: null,
      filename: null,
      filesize: null,
      supportsRangeRequests: false,
      fromCache: false,
    });

    try {
      const result = await realDebridService.getStreamableVideoUrl(magnetLink);

      setStreamingState({
        isLoading: false,
        error: null,
        streamUrl: result.streamUrl,
        filename: result.filename,
        filesize: result.filesize,
        supportsRangeRequests: result.supportsRangeRequests || false,
        fromCache: false, // This was fetched fresh
      });
    } catch (error) {
      console.error('Streaming error:', error);
      setStreamingState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to prepare video stream',
      }));
    }
  }, []);

  // Regenerate stream link when backend link has network error
  const regenerateStreamLink = useCallback(async () => {
    const magnetLink = currentMagnetLinkRef.current;
    if (!magnetLink) {
      console.error('❌ [StreamWithCache] No magnet link available for regeneration');
      return false;
    }

    setStreamingState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    if (!realDebridService.isConfigured()) {
      setStreamingState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          'Real-Debrid API key not configured. Please configure your API key in Account Settings to enable premium streaming.',
      }));
      return false;
    }

    try {
      // Deep refresh: backend deletes the stale RD torrent, re-adds the magnet,
      // re-unrestricts, and HEAD-validates the new URL before caching. Falls
      // back to shallow regen if the deep path errors (e.g. older backend).
      let result: Awaited<ReturnType<typeof realDebridService.deepRefreshStreamUrl>>;
      try {
        result = await realDebridService.deepRefreshStreamUrl(magnetLink);
      } catch (deepErr) {
        console.warn(
          '[StreamWithCache] Deep refresh failed, falling back to shallow:',
          deepErr
        );
        result = await realDebridService.getStreamableVideoUrl(magnetLink, true);
      }

      setStreamingState({
        isLoading: false,
        error: null,
        streamUrl: result.streamUrl,
        filename: result.filename,
        filesize: result.filesize,
        supportsRangeRequests: result.supportsRangeRequests || false,
        fromCache: false, // This was regenerated fresh
      });

      // Invalidate cache status for this magnet link to update UI
      invalidateCacheStatus(magnetLink);

      return true;
    } catch (error) {
      console.error('❌ [StreamWithCache] Failed to regenerate stream link:', error);
      setStreamingState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to regenerate stream link',
      }));
      return false;
    }
  }, []);

  // Check if magnet has cached stream URL
  const hasCachedUrl = useCallback((magnetLink: string): boolean => {
    return realDebridService.hasCachedStreamUrl(magnetLink);
  }, []);

  // Async version for more comprehensive check
  const hasCachedUrlAsync = useCallback(
    async (magnetLink: string): Promise<boolean> => {
      return await realDebridService.hasCachedStreamUrlAsync(magnetLink);
    },
    []
  );

  // Reset streaming state
  const resetStreaming = useCallback(() => {
    currentMagnetLinkRef.current = null;
    setStreamingState({
      isLoading: false,
      error: null,
      streamUrl: null,
      filename: null,
      filesize: null,
      supportsRangeRequests: false,
      fromCache: false,
    });
  }, []);

  return {
    streamingState,
    startStreamingWithCache,
    regenerateStreamLink,
    hasCachedUrl,
    hasCachedUrlAsync,
    resetStreaming,
  };
};
