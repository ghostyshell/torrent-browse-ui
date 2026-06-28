import { useState, useCallback, useRef } from 'react';
import { realDebridService } from '../services/realDebridService';
import { invalidateCacheStatus } from './useCacheStatus';

interface DirectStreamingState {
  isLoading: boolean;
  error: string | null;
  streamUrl: string | null;
  filename: string | null;
  filesize: number | null;
  supportsRangeRequests: boolean;
}

export const useDirectStreaming = () => {
  const [streamingState, setStreamingState] = useState<DirectStreamingState>({
    isLoading: false,
    error: null,
    streamUrl: null,
    filename: null,
    filesize: null,
    supportsRangeRequests: false,
  });

  // Store the magnet link for potential regeneration
  const currentMagnetLinkRef = useRef<string | null>(null);

  // Start streaming directly from cached URL
  const startDirectStreaming = useCallback(async (magnetLink: string) => {
    currentMagnetLinkRef.current = magnetLink;

    // Set loading state
    setStreamingState({
      isLoading: true,
      error: null,
      streamUrl: null,
      filename: null,
      filesize: null,
      supportsRangeRequests: false,
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

    // Get cached stream URL (checks both localStorage and Turso backend)

    const cachedResult = await realDebridService.getCachedStreamUrl(magnetLink);

    if (!cachedResult) {

      setStreamingState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          'No cached stream URL available. Please try streaming from the torrent details first.',
      }));
      return;
    }

    setStreamingState({
      isLoading: false,
      error: null,
      streamUrl: cachedResult.streamUrl,
      filename: cachedResult.filename,
      filesize: cachedResult.filesize,
      supportsRangeRequests: cachedResult.supportsRangeRequests || false,
    });
  }, []);

  // Regenerate stream link when backend link has network error
  const regenerateStreamLink = useCallback(async () => {
    const magnetLink = currentMagnetLinkRef.current;
    if (!magnetLink) {
      console.error('❌ [DirectStreaming] No magnet link available for regeneration');
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
      let result: Awaited<ReturnType<typeof realDebridService.deepRefreshStreamUrl>>;
      try {
        result = await realDebridService.deepRefreshStreamUrl(magnetLink);
      } catch (deepErr) {
        console.warn(
          '[DirectStreaming] Deep refresh failed, falling back to shallow:',
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
      });

      // Invalidate cache status for this magnet link to update UI
      invalidateCacheStatus(magnetLink);

      return true;
    } catch (error) {
      console.error('❌ [DirectStreaming] Failed to regenerate stream link:', error);
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
  const hasCachedUrl = useCallback(
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
    });
  }, []);

  return {
    streamingState,
    startDirectStreaming,
    regenerateStreamLink,
    hasCachedUrl,
    resetStreaming,
  };
};
