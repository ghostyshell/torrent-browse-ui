import { useEffect, useRef, useState } from 'react';
import { Torrent } from '../types/Torrent';
import { magnetCacheService } from '../utils/magnetCache';
import apiClient from '../services/apiClient';
import { isCancel } from 'axios';

interface PrefetchProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

/**
 * Hook to automatically pre-fetch magnet links for 1337x torrents
 * This ensures magnets are available without opening the details modal
 */
export const useMagnetPrefetcher = (
  torrents: Torrent[],
  enabled: boolean = true
) => {
  const [progress, setProgress] = useState<PrefetchProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false,
  });

  // Track which torrents we've already attempted to fetch
  const attemptedFetches = useRef(new Set<string>());
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Filter for 1337x torrents that don't have magnets and haven't been fetched
    const torrentsNeedingMagnets = torrents.filter((torrent) => {
      if (torrent.Source?.toLowerCase() !== '1337x') return false;
      if (torrent.Magnet) return false; // Already has magnet
      if (!torrent.Url) return false; // Need URL to fetch details

      // Check if already cached
      const cached = magnetCacheService.get(torrent.Source, torrent.Url);
      if (cached) return false;

      // Check if already attempted
      const key = `${torrent.Source}:${torrent.Url}`;
      if (attemptedFetches.current.has(key)) return false;

      return true;
    });

    if (torrentsNeedingMagnets.length === 0) {
      return;
    }

    console.log(
      `🔍 [MagnetPrefetcher] Found ${torrentsNeedingMagnets.length} 1337x torrents needing magnets`
    );

    // Mark these torrents as attempted
    torrentsNeedingMagnets.forEach((torrent) => {
      const key = `${torrent.Source}:${torrent.Url}`;
      attemptedFetches.current.add(key);
    });

    // Set up abort controller for cleanup
    abortController.current = new AbortController();

    setProgress({
      total: torrentsNeedingMagnets.length,
      completed: 0,
      failed: 0,
      inProgress: true,
    });

    // Fetch magnets with concurrency control
    fetchMagnetsWithConcurrency(
      torrentsNeedingMagnets,
      abortController.current.signal
    );

    return () => {
      // Cleanup on unmount or when torrents change
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [torrents, enabled]);

  const fetchMagnetsWithConcurrency = async (
    torrentsToFetch: Torrent[],
    signal: AbortSignal
  ) => {
    const CONCURRENT_REQUESTS = 3; // Fetch 3 at a time to avoid overwhelming the server
    let completed = 0;
    let failed = 0;

    // Process torrents in batches
    for (let i = 0; i < torrentsToFetch.length; i += CONCURRENT_REQUESTS) {
      if (signal.aborted) break;

      const batch = torrentsToFetch.slice(i, i + CONCURRENT_REQUESTS);
      const promises = batch.map((torrent) =>
        fetchMagnetForTorrent(torrent, signal)
      );

      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          completed++;
        } else {
          failed++;
          const torrent = batch[index];
          console.warn(
            `⚠️ [MagnetPrefetcher] Failed to fetch magnet for: ${torrent.Name}`
          );
        }
      });

      setProgress({
        total: torrentsToFetch.length,
        completed,
        failed,
        inProgress: completed + failed < torrentsToFetch.length,
      });
    }

    console.log(
      `✅ [MagnetPrefetcher] Completed: ${completed}/${torrentsToFetch.length} (${failed} failed)`
    );

    setProgress((prev) => ({
      ...prev,
      inProgress: false,
    }));
  };

  const fetchMagnetForTorrent = async (
    torrent: Torrent,
    signal: AbortSignal
  ): Promise<boolean> => {
    try {
      console.log(`🔄 [MagnetPrefetcher] Fetching magnet for: ${torrent.Name}`);

      const encodedUrl = encodeURIComponent(torrent.Url);
      const response = await apiClient.get(
        `/api/torrents/details/${torrent.Source}/${encodedUrl}`,
        {
          signal,
          timeout: 90000,
        }
      );

      const magnet = response.data?.magnet;

      if (magnet && torrent.Source && torrent.Url) {
        console.log(
          `✅ [MagnetPrefetcher] Got magnet for: ${torrent.Name?.substring(0, 50)}`
        );

        // Cache the magnet (this will dispatch the magnet-cached event)
        magnetCacheService.cache(torrent.Source, torrent.Url, magnet);

        // Also persist to backend if we have a persistence service
        await persistMagnetToBackend(torrent, magnet);

        return true;
      }

      return false;
    } catch (error) {
      if (isCancel(error) || signal.aborted) {
        console.log(`🛑 [MagnetPrefetcher] Fetch cancelled for: ${torrent.Name}`);
      } else {
        console.error(
          `❌ [MagnetPrefetcher] Error fetching magnet for ${torrent.Name}:`,
          error
        );
      }
      return false;
    }
  };

  const persistMagnetToBackend = async (
    torrent: Torrent,
    magnet: string
  ): Promise<void> => {
    try {
      // Store in backend cache for long-term persistence
      await apiClient.post('/api/cache/magnet', {
        source: torrent.Source,
        url: torrent.Url,
        magnet: magnet,
        torrentName: torrent.Name,
      });
      console.log(`💾 [MagnetPrefetcher] Persisted magnet to backend for: ${torrent.Name}`);
    } catch (error) {
      console.warn(
        `⚠️ [MagnetPrefetcher] Failed to persist magnet to backend:`,
        error
      );
      // Non-critical error, don't throw
    }
  };

  return {
    progress,
    isPreFetching: progress.inProgress,
  };
};
