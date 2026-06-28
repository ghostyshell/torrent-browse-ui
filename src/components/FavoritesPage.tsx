import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  Button,
  Alert,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  favoritesService,
  FavoriteTorrent,
} from '../services/favoritesService';
import TorrentCard from './torrent/TorrentCard';
import { TorrentDetailsModal } from './TorrentDetailsModal';
import { VideoPlayerModal } from './VideoPlayerModalVideoJS';
import { useDirectStreaming } from '../hooks/useDirectStreaming';
import { useStreamWithCache } from '../hooks/useStreamWithCache';
import { invalidateAllCacheStatus } from '../hooks/useCacheStatus';
import LoadingSpinner from './LoadingSpinner';
import BatchCacheProcessor from './BatchCacheProcessor';
import Pagination from './Pagination';
import PageLimitSelector from './PageLimitSelector';
import { realDebridService } from '../services/realDebridService';

interface FavoritesPageProps {
  onBack: () => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ onBack }) => {
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const [favorites, setFavorites] = useState<FavoriteTorrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const currentPage = parseInt(urlSearchParams.get('page') || '1', 10) || 1;
  const [pageLimit, setPageLimit] = useState(20);

  const setCurrentPage = useCallback((page: number) => {
    setUrlSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (page <= 1) {
        next.delete('page');
      } else {
        next.set('page', String(page));
      }
      return next;
    }, { replace: true });
  }, [setUrlSearchParams]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [selectedTorrent, setSelectedTorrent] =
    useState<FavoriteTorrent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [directStreamModalOpen, setDirectStreamModalOpen] = useState(false);
  const [cacheStreamModalOpen, setCacheStreamModalOpen] = useState(false);
  const [refreshingUrls, setRefreshingUrls] = useState(false);
  const [cacheRefreshTrigger, setCacheRefreshTrigger] = useState(0);

  // Cover image sync dialog removed - covers now automatically backend-only

  // Direct streaming hook
  const { streamingState, startDirectStreaming, regenerateStreamLink, resetStreaming } =
    useDirectStreaming();

  // Cache and play streaming hook
  const {
    streamingState: cacheStreamingState,
    startStreamingWithCache,
    regenerateStreamLink: regenerateCacheStreamLink,
    resetStreaming: resetCacheStreaming,
  } = useStreamWithCache();

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

  useEffect(() => {
    if (!dataLoaded) {
      loadFavorites();
    }
  }, [dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close timers removed - errors are now handled within VideoPlayerModal

  const loadFavorites = async (page: number = currentPage, limit: number = pageLimit) => {
    setLoading(true);

    try {
      // Load the favorites page from the backend. The response already includes
      // each favorite's cover image inline, and every card resolves its own
      // cache status via useCacheStatus, so we render as soon as this returns
      // rather than blocking first paint on page-level batch prefetches.
      const result = await favoritesService.getFavorites(page, limit);
      setFavorites(result.favorites);
      setPagination(result.pagination);
    } catch (error) {
      console.error('❌ [Favorites] Loading error:', error);
    } finally {
      // Mark data as loaded to prevent unnecessary reloads / retries.
      setDataLoaded(true);
      setLoading(false);
    }
  };

  // Refresh all favorites' stream URLs
  const handleRefreshAllStreamUrls = async () => {
    setRefreshingUrls(true);
    try {
      // Get ALL favorites (not just current page) using the dedicated method
      const allFavorites = await favoritesService.getAllFavorites();
      console.log(`[Refresh Stream URLs] Fetched ${allFavorites.length} total favorites`);

      // Filter to only magnet links
      const magnetFavorites = allFavorites.filter(fav =>
        fav.Magnet && fav.Magnet.toLowerCase().startsWith('magnet:')
      );
      console.log(`[Refresh Stream URLs] Found ${magnetFavorites.length} favorites with magnet links`);

      if (magnetFavorites.length === 0) {
        alert('No magnet links found in favorites to refresh.');
        setRefreshingUrls(false);
        return;
      }

      let refreshed = 0;
      let failed = 0;

      // Refresh each magnet link's stream URL
      for (const favorite of magnetFavorites) {
        try {
          // Force refresh - bypasses all caches
          await realDebridService.getStreamableVideoUrl(favorite.Magnet, true);
          refreshed++;
        } catch (error) {
          console.warn(`Failed to refresh stream URL for: ${favorite.Name}`, error);
          failed++;
        }
      }

      // Show result
      const total = magnetFavorites.length;
      if (refreshed > 0 && failed === 0) {
        alert(`Successfully refreshed ${refreshed}/${total} stream URL${refreshed > 1 ? 's' : ''}`);
      } else if (refreshed > 0 && failed > 0) {
        alert(`Refreshed ${refreshed}/${total} stream URL${refreshed > 1 ? 's' : ''}, but ${failed} failed`);
      } else {
        alert(`Failed to refresh stream URLs. ${failed}/${total} errors occurred.`);
      }

      // Invalidate cache status to force UI update
      invalidateAllCacheStatus();

      // Trigger cache status refresh in all TorrentCard components
      setCacheRefreshTrigger(prev => prev + 1);

      // Reload current page to reflect changes
      loadFavorites(currentPage, pageLimit);
    } catch (error) {
      console.error('Error refreshing stream URLs:', error);
      alert('Failed to refresh stream URLs. Please try again.');
    } finally {
      setRefreshingUrls(false);
    }
  };

  const handleCardClick = (torrent: FavoriteTorrent) => {
    setSelectedTorrent(torrent);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTorrent(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadFavorites(page, pageLimit);
  };

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
    loadFavorites(1, newLimit);
  };

  const handleRefreshFavorites = () => {
    loadFavorites(currentPage, pageLimit);
  };

  const handleDirectPlay = async (torrent: FavoriteTorrent) => {

    setSelectedTorrent(torrent);

    // For 1337x torrents without magnet, fetch details first
    let magnetLink = torrent.Magnet;
    if (!magnetLink && torrent.Source?.toLowerCase() === '1337x' && torrent.Url) {
      try {
        const { torrentApi } = await import('../services/torrentApi');
        const details = await torrentApi.getTorrentDetails('1337x', torrent.Url);
        if (details.magnet) {
          magnetLink = details.magnet;
          console.log('[Direct Play] Fetched magnet for 1337x torrent');
        }
      } catch (error) {
        console.error('[Direct Play] Failed to fetch magnet:', error);
      }
    }

    if (magnetLink) {

      setDirectStreamModalOpen(true);
      startDirectStreaming(magnetLink);
    } else {
      alert('Could not find magnet link for this torrent. Please open the details modal first.');
    }
  };

  const handleCacheAndPlay = async (torrent: FavoriteTorrent) => {

    setSelectedTorrent(torrent);

    // For 1337x torrents without magnet, fetch details first
    let magnetLink = torrent.Magnet;
    if (!magnetLink && torrent.Source?.toLowerCase() === '1337x' && torrent.Url) {
      try {
        const { torrentApi } = await import('../services/torrentApi');
        const details = await torrentApi.getTorrentDetails('1337x', torrent.Url);
        if (details.magnet) {
          magnetLink = details.magnet;
          console.log('[Cache & Play] Fetched magnet for 1337x torrent');
        }
      } catch (error) {
        console.error('[Cache & Play] Failed to fetch magnet:', error);
      }
    }

    if (magnetLink) {

      setCacheStreamModalOpen(true);
      startStreamingWithCache(magnetLink);
    } else {
      alert('Could not find magnet link for this torrent. Please open the details modal first.');
    }
  };

  // Sync handlers removed - covers now automatically backend-only

  if (loading) {
    return <LoadingSpinner message='Loading favorites...' />;
  }

  return (
    <Container maxWidth='lg' sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={onBack} color='primary'>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant='h4' component='h1'>
              ⭐ My Favorites
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              ({pagination?.totalCount || 0}{' '}
              {(pagination?.totalCount || 0) === 1 ? 'torrent' : 'torrents'})
            </Typography>
          </Box>

        </Box>
      </Paper>

      {/* Content */}
      {(pagination?.totalCount || 0) === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant='h6' color='text.secondary' gutterBottom>
            No favorites yet
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
            Start adding torrents to your favorites from the torrent details
            page
          </Typography>
          <Button variant='contained' onClick={onBack}>
            Back to Search
          </Button>
        </Paper>
      ) : (
        <>
          {/* Batch Cache Processor */}
          <BatchCacheProcessor
            torrents={favorites}
            title='Batch Cache & Play Favorites'
          />

          {/* Top Controls */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2,
            flexWrap: 'wrap',
            gap: 2
          }}>
            <PageLimitSelector
              pageLimit={pageLimit}
              onPageLimitChange={handlePageLimitChange}
              disabled={loading}
            />
            
            {(pagination?.totalPages || 0) > 1 && (
              <Pagination
                currentPage={currentPage}
                totalResults={pagination?.totalCount || 0}
                onPageChange={handlePageChange}
                loading={loading}
              />
            )}
          </Box>

          <Grid container spacing={2}>
            {favorites.map((torrent, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
                <TorrentCard
                  torrent={torrent}
                  onClick={(t) => handleCardClick(torrent)}
                  onDirectPlay={(t) => handleDirectPlay(torrent)}
                  onCacheAndPlay={(t) => handleCacheAndPlay(torrent)}
                  cacheRefreshTrigger={cacheRefreshTrigger}
                />
              </Grid>
            ))}
          </Grid>

          {/* Bottom Controls */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mt: 3,
            flexWrap: 'wrap',
            gap: 2
          }}>
            <PageLimitSelector
              pageLimit={pageLimit}
              onPageLimitChange={handlePageLimitChange}
              disabled={loading}
            />
            
            {(pagination?.totalPages || 0) > 1 && (
              <Pagination
                currentPage={currentPage}
                totalResults={pagination?.totalCount || 0}
                onPageChange={handlePageChange}
                loading={loading}
              />
            )}
          </Box>

          {/* Show info about favorites and refresh button */}
          <Alert
            severity='info'
            sx={{ mt: 3 }}
            action={
              pagination.totalCount > 0 && (
                <Button
                  color='inherit'
                  size='small'
                  startIcon={<RefreshIcon />}
                  disabled={refreshingUrls || loading}
                  onClick={handleRefreshAllStreamUrls}
                >
                  {refreshingUrls ? 'Refreshing...' : 'Refresh All Stream URLs'}
                </Button>
              )
            }
          >
            💡 {pagination.totalCount} favorite{pagination.totalCount !== 1 ? 's' : ''} total.
            Click "Refresh All Stream URLs" to regenerate expired stream links for all favorites.
          </Alert>
        </>
      )}

      {/* Torrent Details Modal */}
      <TorrentDetailsModal
        torrent={selectedTorrent}
        open={modalOpen}
        onClose={handleModalClose}
      />

      {/* Streaming errors are now handled within the VideoPlayerModal */}

      {/* Direct Stream Video Player Modal */}
      <VideoPlayerModal
        open={directStreamModalOpen}
        onClose={handleDirectStreamModalClose}
        videoUrl={streamingState.streamUrl || ''}
        filename={streamingState.filename || 'Direct Stream'}
        loading={streamingState.isLoading}
        error={streamingState.error}
        supportsRangeRequests={streamingState.supportsRangeRequests}
        torrent={selectedTorrent || undefined}
        onRetryWithRegeneration={async () => {

          await regenerateStreamLink();
        }}
      />

      {/* Cache Stream Video Player Modal */}
      <VideoPlayerModal
        open={cacheStreamModalOpen}
        onClose={handleCacheStreamModalClose}
        videoUrl={cacheStreamingState.streamUrl || ''}
        filename={
          cacheStreamingState.filename ||
          `${cacheStreamingState.fromCache ? 'Cached' : 'New'} Stream`
        }
        loading={cacheStreamingState.isLoading}
        error={cacheStreamingState.error}
        supportsRangeRequests={cacheStreamingState.supportsRangeRequests}
        torrent={selectedTorrent || undefined}
        onRetryWithRegeneration={async () => {

          await regenerateCacheStreamLink();
        }}
      />
    </Container>
  );
};

export default FavoritesPage;
