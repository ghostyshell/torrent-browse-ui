import { useState, useEffect, useCallback, useRef } from 'react';
import { Torrent } from '../types/Torrent';
import { torrentApi } from '../services/torrentApi';
import { torrentDetailsCache } from '../utils/torrentDetailsCache';

interface TorrentDetailsData {
  description: string;
  files: { name: string; size: string }[];
  comments: { author: string; comment: string; date: string }[];
  images: { originalUrl: string; directUrl: string }[];
  magnet?: string;
  hash?: string;
  error?: string;
}

interface UseTorrentDetailsReturn {
  torrentDetails: TorrentDetailsData | null;
  loadingDetails: boolean;
  detailsError: string | null;
  fetchTorrentDetails: () => void;
  forceRefreshDetails: () => void;
}

export const useTorrentDetails = (
  torrent: Torrent | null,
  open: boolean
): UseTorrentDetailsReturn => {
  const initializeTorrentDetails = () => {
    if (open && torrent && torrent.Url) {
      const supportsDetailsAPI = ['piratebay', 'limetorrent'].includes(
        torrent.Source?.toLowerCase() || ''
      );
      if (supportsDetailsAPI) {
        const source = (torrent.Source || '').toLowerCase();
        const url = torrent.Url;
        const cachedDetails = torrentDetailsCache.get(source, url);
        if (cachedDetails) {
          const { timestamp, ...detailsWithoutTimestamp } = cachedDetails;
          return detailsWithoutTimestamp;
        }
      }
    }
    return null;
  };

  const [torrentDetails, setTorrentDetails] =
    useState<TorrentDetailsData | null>(initializeTorrentDetails);

  const initializeLoadingState = () => {
    if (open && torrent && torrent.Url) {
      const supportsDetailsAPI = ['piratebay', 'limetorrent'].includes(
        torrent.Source?.toLowerCase() || ''
      );
      if (supportsDetailsAPI) {
        const source = (torrent.Source || '').toLowerCase();
        const url = torrent.Url;
        const cachedDetails = torrentDetailsCache.get(source, url);
        return !cachedDetails;
      }
    }
    return false;
  };

  const [loadingDetails, setLoadingDetails] = useState(initializeLoadingState);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000;
    const cleanup = () => {
      if (process.env.NODE_ENV === 'development') {
        torrentDetailsCache.getStats();
      }
    };

    const interval = setInterval(cleanup, CACHE_CLEANUP_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const fetchTorrentDetails = useCallback(async () => {
    if (!torrent || !torrent.Url || !torrent.Source) return;

    const source = torrent.Source.toLowerCase();
    const url = torrent.Url;

    const cachedDetails = torrentDetailsCache.get(source, url);
    if (cachedDetails) {
      if (isMountedRef.current) {
        const { timestamp, ...detailsWithoutTimestamp } = cachedDetails;
        setTorrentDetails(detailsWithoutTimestamp);
        setDetailsError(null);
        setLoadingDetails(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setLoadingDetails(true);
      setDetailsError(null);
    }

    try {
      const details = await torrentApi.getTorrentDetails(source, url);
      torrentDetailsCache.set(source, url, details);

      if (isMountedRef.current) {
        setTorrentDetails(details);
      }

      // For 1337x torrents that are favorites, update the magnet link if available
      if (source === '1337x' && details.magnet && (torrent as any).favoriteEntryId) {
        const favoriteEntryId = (torrent as any).favoriteEntryId;
        console.log(`[TorrentDetails] Updating magnet link for 1337x favorite ${favoriteEntryId}`);

        // Dynamically import to avoid circular dependency
        const { favoritesService } = await import('../services/favoritesService');
        const success = await favoritesService.updateMagnetLink(favoriteEntryId, details.magnet);

        if (success) {
          console.log(`[TorrentDetails] Successfully updated magnet link for favorite ${favoriteEntryId}`);
        } else {
          console.warn(`[TorrentDetails] Failed to update magnet link for favorite ${favoriteEntryId}`);
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load torrent details';
      const errorDetails = {
        description: '',
        files: [],
        comments: [],
        images: [],
        error: errorMessage,
      };
      torrentDetailsCache.set(source, url, errorDetails);

      if (isMountedRef.current) {
        setDetailsError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingDetails(false);
      }
    }
  }, [torrent]);

  const forceRefreshDetails = useCallback(() => {
    if (!torrent || !torrent.Url || !torrent.Source) return;

    torrentDetailsCache.delete(
      torrent.Source.toLowerCase(),
      torrent.Url
    );

    if (process.env.NODE_ENV === 'development') {
      torrentDetailsCache.getStats();
    }

    setTorrentDetails(null);
    setDetailsError(null);
    fetchTorrentDetails();
  }, [torrent, fetchTorrentDetails]);

  const handleModalStateChange = useCallback(() => {
    isMountedRef.current = true;

    if (open && torrent && torrent.Url) {
      const supportsDetailsUI = ['piratebay', 'limetorrent', 'cached-links', '1337x'].includes(
        torrent.Source?.toLowerCase() || ''
      );
      const supportsDetailsAPI = ['piratebay', 'limetorrent', '1337x'].includes(
        torrent.Source?.toLowerCase() || ''
      );

      if (supportsDetailsAPI) {
        const source = (torrent.Source || '').toLowerCase();
        const url = torrent.Url;
        const cachedDetails = torrentDetailsCache.get(source, url);

        if (cachedDetails) {
          const { timestamp, ...detailsWithoutTimestamp } = cachedDetails;
          setTorrentDetails(detailsWithoutTimestamp);
          setDetailsError(null);
          setLoadingDetails(false);
        } else {
          setLoadingDetails(true);
          setDetailsError(null);
          setTorrentDetails(null);
          fetchTorrentDetails();
        }
      } else if (supportsDetailsUI && torrent.Source?.toLowerCase() === 'cached-links') {
        setTorrentDetails({
          description: 'This is a cached link. No additional description available.',
          files: [],
          comments: [],
          images: [],
        });
        setDetailsError(null);
        setLoadingDetails(false);
      } else {
        setTorrentDetails(null);
        setDetailsError(null);
        setLoadingDetails(false);
      }
    } else {
      setTorrentDetails(null);
      setDetailsError(null);
      setLoadingDetails(false);
    }
  }, [open, torrent, fetchTorrentDetails]);

  useEffect(handleModalStateChange, [handleModalStateChange]);

  return {
    torrentDetails,
    loadingDetails,
    detailsError,
    fetchTorrentDetails,
    forceRefreshDetails,
  };
};
