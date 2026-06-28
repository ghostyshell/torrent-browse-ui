import { useState, useCallback, useRef } from 'react';
import { useRealDebridService } from './useRealDebridService';

interface StreamingState {
  isLoading: boolean;
  error: string | null;
  streamUrl: string | null;
  filename: string | null;
  filesize: number | null;
  supportsRangeRequests: boolean;
}

export const useVideoStreaming = () => {
  const { isInitialized, isConfigured, realDebridService } =
    useRealDebridService();
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isLoading: false,
    error: null,
    streamUrl: null,
    filename: null,
    filesize: null,
    supportsRangeRequests: false,
  });

  // Store the magnet link for potential regeneration
  const currentMagnetLinkRef = useRef<string | null>(null);

  const startStreaming = useCallback(
    async (magnetLink: string) => {
      currentMagnetLinkRef.current = magnetLink;

      // Wait for service to be initialized
      if (!isInitialized) {
        setStreamingState((prev) => ({
          ...prev,
          error:
            'Real-Debrid service is initializing. Please try again in a moment.',
        }));
        return;
      }

      if (!isConfigured) {
        setStreamingState((prev) => ({
          ...prev,
          error:
            'Real-Debrid API key not configured. Please configure your API key in Account Settings to enable premium streaming.',
        }));
        return;
      }

      setStreamingState({
        isLoading: true,
        error: null,
        streamUrl: null,
        filename: null,
        filesize: null,
        supportsRangeRequests: false,
      });

      try {
        const result = await realDebridService.getStreamableVideoUrl(
          magnetLink
        );

        setStreamingState({
          isLoading: false,
          error: null,
          streamUrl: result.streamUrl,
          filename: result.filename,
          filesize: result.filesize,
          supportsRangeRequests: result.supportsRangeRequests || false,
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
    },
    [isInitialized, isConfigured, realDebridService]
  );

  // Regenerate stream link when backend link has network error
  const regenerateStreamLink = useCallback(async () => {
    const magnetLink = currentMagnetLinkRef.current;
    if (!magnetLink) {
      console.error('❌ [VideoStreaming] No magnet link available for regeneration');
      return false;
    }

    if (!isInitialized) {
      setStreamingState((prev) => ({
        ...prev,
        error:
          'Real-Debrid service is initializing. Please try again in a moment.',
      }));
      return false;
    }

    if (!isConfigured) {
      setStreamingState((prev) => ({
        ...prev,
        error:
          'Real-Debrid API key not configured. Please configure your API key in Account Settings to enable premium streaming.',
      }));
      return false;
    }

    setStreamingState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      let result: Awaited<ReturnType<typeof realDebridService.deepRefreshStreamUrl>>;
      try {
        result = await realDebridService.deepRefreshStreamUrl(magnetLink);
      } catch (deepErr) {
        console.warn(
          '[VideoStreaming] Deep refresh failed, falling back to shallow:',
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

      return true;
    } catch (error) {
      console.error('❌ [VideoStreaming] Failed to regenerate stream link:', error);
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
  }, [isInitialized, isConfigured, realDebridService]);

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
    ...streamingState,
    startStreaming,
    regenerateStreamLink,
    resetStreaming,
  };
};
