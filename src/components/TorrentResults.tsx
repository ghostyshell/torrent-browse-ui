import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, Alert, Link, LinearProgress } from '@mui/material';
import { Sync as SyncIcon } from '@mui/icons-material';
import { Torrent } from '../types/Torrent';
import { TorrentDetailsModal } from './TorrentDetailsModal';
import { VideoPlayerModal } from './VideoPlayerModalVideoJS';
import { useDirectStreaming } from '../hooks/useDirectStreaming';
import { useStreamWithCache } from '../hooks/useStreamWithCache';
import { useMagnetPrefetcher } from '../hooks/useMagnetPrefetcher';
import Pagination from './Pagination';
import TorrentCard from './torrent/TorrentCard';
import LoadingSpinner from './LoadingSpinner';
import NoResults from './NoResults';
import BatchCacheProcessor from './BatchCacheProcessor';
import { favoritesService } from '../services/favoritesService';

interface TorrentResultsProps {
  torrents: Torrent[];
  loading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  searchParams?: {
    query: string;
    website: string;
    quality: string;
    customFilter: string;
    minSeeders: number;
  } | null;
  /** Browse homepage (no search query) — adjusts copy and loading message */
  browseMode?: boolean;
}

const TorrentResults: React.FC<TorrentResultsProps> = ({
  torrents,
  loading,
  currentPage,
  onPageChange,
  searchParams,
  browseMode = false,
}) => {
  const [selectedTorrent, setSelectedTorrent] = useState<Torrent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [directStreamModalOpen, setDirectStreamModalOpen] = useState(false);
  const [cacheStreamModalOpen, setCacheStreamModalOpen] = useState(false);

  // Direct streaming hook
  const { streamingState, startDirectStreaming, resetStreaming, regenerateStreamLink } =
    useDirectStreaming();

  // Cache and play streaming hook
  const {
    streamingState: cacheStreamingState,
    startStreamingWithCache,
    resetStreaming: resetCacheStreaming,
    regenerateStreamLink: regenerateCacheStreamLink,
  } = useStreamWithCache();

  // Auto-fetch magnets for 1337x results
  const { progress: magnetProgress, isPreFetching } = useMagnetPrefetcher(
    torrents,
    true // enabled
  );

  // Callback functions for modal handling
  const handleDirectStreamModalClose = useCallback(() => {
    setDirectStreamModalOpen(false);
    resetStreaming();
    setSelectedTorrent(null);
  }, [resetStreaming]);

  const handleCacheStreamModalClose = useCallback(() => {
    setCacheStreamModalOpen(false);
    resetCacheStreaming();
    setSelectedTorrent(null);
  }, [resetCacheStreaming]);

  // Sync favorites from backend to localStorage when torrents are loaded
  useEffect(() => {
    if (torrents.length > 0) {

      favoritesService.syncFavoritesToLocalStorage().catch(error => {
        console.warn('⚠️ [TorrentResults] Failed to sync favorites:', error);
      });
    }
  }, [torrents]);

  const handleCardClick = (torrent: Torrent) => {
    setSelectedTorrent(torrent);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTorrent(null);
  };

  const handleDirectPlay = (torrent: Torrent) => {

    setSelectedTorrent(torrent);

    if (torrent.Magnet) {
      startDirectStreaming(torrent.Magnet);
      setDirectStreamModalOpen(true);
    }
  };

  const handleCacheAndPlay = (torrent: Torrent) => {
    setSelectedTorrent(torrent);

    if (torrent.Magnet) {
      startStreamingWithCache(torrent.Magnet);
      setCacheStreamModalOpen(true);
    }
  };

  // Close error alert automatically after streaming error is resolved
  useEffect(() => {
    if (streamingState.error && directStreamModalOpen) {
      const timer = setTimeout(() => {
        handleDirectStreamModalClose();
      }, 5000); // Auto-close error after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [
    streamingState.error,
    directStreamModalOpen,
    handleDirectStreamModalClose,
  ]);

  // Close cache stream error alert automatically after streaming error is resolved
  useEffect(() => {
    if (cacheStreamingState.error && cacheStreamModalOpen) {
      const timer = setTimeout(() => {
        handleCacheStreamModalClose();
      }, 5000); // Auto-close error after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [
    cacheStreamingState.error,
    cacheStreamModalOpen,
    handleCacheStreamModalClose,
  ]);

  if (loading) {
    if (browseMode) {
      return <LoadingSpinner message='Loading latest uploads...' />;
    }
    // Show a longer message for 1337x as it uses FlareSolverr which takes time
    const is1337x = searchParams?.website?.toLowerCase() === '1337x';
    const loadingMessage = is1337x
      ? 'Searching 1337x... This may take up to 60 seconds due to Cloudflare protection.'
      : 'Searching torrents...';
    return <LoadingSpinner message={loadingMessage} />;
  }

  if (torrents.length === 0) {
    return <NoResults />;
  }

  // Build PirateBay validation URL
  const buildPirateBayUrl = () => {
    if (!searchParams) return null;

    // Combine query with filters just like in the search
    let combinedQuery = searchParams.query.trim();
    if (searchParams.quality) {
      combinedQuery += ` ${searchParams.quality}`;
    }
    if (searchParams.customFilter) {
      combinedQuery += ` ${searchParams.customFilter}`;
    }

    // Encode the query for URL
    const encodedQuery = encodeURIComponent(combinedQuery);

    // Build PirateBay URL with search query
    // Format: https://thepiratebay.org/search.php?q=QUERY
    return `https://thepiratebay.org/search.php?q=${encodedQuery}`;
  };

  const pirateBayUrl = buildPirateBayUrl();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant='h5' gutterBottom sx={{ mb: 0 }}>
          {browseMode
            ? `Page ${currentPage} - ${torrents.length} torrents`
            : `Found ${torrents.length} torrents`}
        </Typography>
        {pirateBayUrl && searchParams && !browseMode && (
          <Link
            href={pirateBayUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontSize: '0.9rem',
              textDecoration: 'underline',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Validate on PirateBay: "{searchParams.query}{searchParams.quality ? ` ${searchParams.query}` : ''}{searchParams.customFilter ? ` ${searchParams.customFilter}` : ''}"
          </Link>
        )}
      </Box>

      {/* Magnet Pre-fetching Progress */}
      {isPreFetching && magnetProgress.total > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <SyncIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant='body2' color='text.secondary'>
              Pre-fetching magnet links for 1337x results... {magnetProgress.completed}/{magnetProgress.total}
              {magnetProgress.failed > 0 && ` (${magnetProgress.failed} failed)`}
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={(magnetProgress.completed / magnetProgress.total) * 100}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}

      {/* Batch Cache Processor */}
      {torrents.length > 0 && (
        <BatchCacheProcessor torrents={torrents} title='Batch Cache & Play' />
      )}

      {/* Top Pagination */}
      {torrents.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalResults={torrents.length}
          onPageChange={onPageChange}
          loading={loading}
        />
      )}

      <Grid container spacing={2}>
        {torrents.map((torrent, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
            <TorrentCard
              torrent={torrent}
              onClick={handleCardClick}
              onDirectPlay={handleDirectPlay}
              onCacheAndPlay={handleCacheAndPlay}
              cacheRefreshTrigger={undefined}
            />
          </Grid>
        ))}
      </Grid>

      {/* Bottom Pagination */}
      {torrents.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalResults={torrents.length}
          onPageChange={onPageChange}
          loading={loading}
        />
      )}

      {/* Torrent Details Modal */}
      <TorrentDetailsModal
        torrent={selectedTorrent}
        open={modalOpen}
        onClose={handleModalClose}
      />

      {/* Direct Stream Error Alert */}
      {streamingState.error && (
        <Alert
          severity='error'
          onClose={handleDirectStreamModalClose}
          sx={{ mb: 2 }}>
          {streamingState.error}
        </Alert>
      )}

      {/* Cache Stream Error Alert */}
      {cacheStreamingState.error && (
        <Alert
          severity='error'
          onClose={handleCacheStreamModalClose}
          sx={{ mb: 2 }}>
          {cacheStreamingState.error}
        </Alert>
      )}

      {/* Direct Stream Video Player Modal */}
      <VideoPlayerModal
        open={directStreamModalOpen && !streamingState.error}
        onClose={handleDirectStreamModalClose}
        videoUrl={streamingState.streamUrl || ''}
        filename={streamingState.filename || 'Direct Stream'}
        loading={streamingState.isLoading}
        supportsRangeRequests={streamingState.supportsRangeRequests}
        torrent={selectedTorrent || undefined}
        onRetryWithRegeneration={async () => {
          await regenerateStreamLink();
        }}
      />

      {/* Cache Stream Video Player Modal */}
      <VideoPlayerModal
        open={cacheStreamModalOpen && !cacheStreamingState.error}
        onClose={handleCacheStreamModalClose}
        videoUrl={cacheStreamingState.streamUrl || ''}
        filename={
          cacheStreamingState.filename ||
          `${cacheStreamingState.fromCache ? 'Cached' : 'New'} Stream`
        }
        loading={cacheStreamingState.isLoading}
        supportsRangeRequests={cacheStreamingState.supportsRangeRequests}
        torrent={selectedTorrent || undefined}
        onRetryWithRegeneration={async () => {
          await regenerateCacheStreamLink();
        }}
      />
    </Box>
  );
};

export default TorrentResults;
