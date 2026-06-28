import React, { useState, useEffect, useCallback } from 'react';
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
import { ArrowBack as ArrowBackIcon, Link as LinkIcon } from '@mui/icons-material';
import { storedLinksService, StoredLink } from '../services/storedLinksService';
import { realDebridService } from '../services/realDebridService';
import LoadingSpinner from './LoadingSpinner';
import { VideoPlayerModal } from './VideoPlayerModalVideoJS';
import StoredLinkCard from './storedLinks/StoredLinkCard';
import Pagination from './Pagination';
import PageLimitSelector from './PageLimitSelector';

interface StoredLinksPageProps {
  onBack: () => void;
}

const StoredLinksPage: React.FC<StoredLinksPageProps> = ({ onBack }) => {
  const [storedLinks, setStoredLinks] = useState<StoredLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(20);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [processingLinks, setProcessingLinks] = useState<Set<string>>(
    new Set()
  );
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentStreamUrl, setCurrentStreamUrl] = useState('');
  const [currentVideoTitle, setCurrentVideoTitle] = useState('');
  const [currentSupportsRangeRequests, setCurrentSupportsRangeRequests] =
    useState(true);

  // Load cached links on component mount
  useEffect(() => {
    if (!dataLoaded) {
      loadStoredLinks();
    }
  }, [dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStoredLinks = async (page: number = currentPage, limit: number = pageLimit) => {
    setLoading(true);

    try {
      const result = await storedLinksService.getStoredLinks(page, limit);
      
      // Handle both paginated and non-paginated responses
      if (result && typeof result === 'object' && 'storedLinks' in result) {
        // Paginated response
        setStoredLinks(result.storedLinks);
        setPagination(result.pagination);
        setCurrentPage(page);

      } else {
        // Non-paginated response (fallback or old API)
        const links = Array.isArray(result) ? result : [];
        setStoredLinks(links);
        // Create mock pagination for non-paginated response
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalCount: links.length,
          limit: links.length,
          hasNextPage: false,
          hasPrevPage: false
        });

      }

      // Mark data as loaded to prevent unnecessary reloads
      setDataLoaded(true);

      // Note: Removed automatic preloading to prevent unnecessary Real-Debrid API calls
      // that cause 429 errors. Torrent info will be loaded on-demand when needed.
    } catch (error) {
      console.error('❌ [StoredLinks] Loading error:', error);
      setStoredLinks([]); // Ensure we always set an array even on error
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: pageLimit,
        hasNextPage: false,
        hasPrevPage: false
      });
      setDataLoaded(true); // Even on error, mark as loaded to prevent retries
    }
    
    setLoading(false);
  };

  // Refresh cached links manually (resets dataLoaded state)
  const refreshStoredLinks = () => {
    setDataLoaded(false);
    loadStoredLinks(currentPage, pageLimit);
  };
  
  const handlePageChange = (page: number) => {

    setDataLoaded(false); // Force reload for new page
    loadStoredLinks(page, pageLimit);
  };

  const handlePageLimitChange = (newLimit: number) => {

    setPageLimit(newLimit);
    // Reset to first page when changing limit
    setCurrentPage(1);
    setDataLoaded(false); // Force reload for new limit
    loadStoredLinks(1, newLimit);
  };

  const handleRemoveLink = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const removed = await storedLinksService.removeStoredLink(id);
    if (removed) {
      // If we're on a page with only one item and it's removed, go to previous page
      if (storedLinks.length === 1 && currentPage > 1) {
        setDataLoaded(false);
        loadStoredLinks(currentPage - 1, pageLimit);
      } else {
        setDataLoaded(false);
        loadStoredLinks(currentPage, pageLimit);
      }
    }
  };

  const sanitizeStreamUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // Remove common download-forcing parameters
      urlObj.searchParams.delete('download');
      urlObj.searchParams.delete('dl');
      urlObj.searchParams.delete('attachment');
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  const handleStreamLink = async (link: StoredLink) => {

    // Prevent multiple simultaneous calls for the same link
    if (processingLinks.has(link.id)) {

      return;
    }

    // Check if we have a valid, non-expired stream URL
    const hasValidStreamUrl =
      link.streamUrl && !storedLinksService.isStreamUrlLikelyExpired(link);

    if (hasValidStreamUrl) {
      // Already has valid stream URL, validate it first
      try {
        new URL(link.streamUrl!); // Validate URL format

        // Test if the URL is accessible
        try {

          await fetch(link.streamUrl!, {
            method: 'HEAD',
            mode: 'no-cors', // Use no-cors to avoid CORS issues when just checking accessibility
          });

        } catch (error) {
          console.warn('⚠️ Could not verify stream URL accessibility:', error);
          // Don't fail here since no-cors mode doesn't give us real response info
        }

        const sanitizedUrl = sanitizeStreamUrl(link.streamUrl!);

        setCurrentStreamUrl(sanitizedUrl);
        setCurrentVideoTitle(link.filename || link.title || 'Cached Stream');
        setCurrentSupportsRangeRequests(link.supportsRangeRequests ?? true);
        setVideoPlayerOpen(true);
        return;
      } catch {
        console.error('Invalid stream URL format:', link.streamUrl);
        // Update the cached link to remove invalid URL and continue to fetch new one
        const invalidUrlData = {
          streamUrl: undefined,
          streamUrlCachedAt: undefined,
          error: 'Invalid stream URL format',
        };

        storedLinksService.updateStoredLinkSync(link.id, invalidUrlData);

        // Update the local state immediately
        setStoredLinks((prevLinks) =>
          prevLinks.map((l) =>
            l.id === link.id ? { ...l, ...invalidUrlData } : l
          )
        );
        // Continue to fetch new URL below
      }
    }

    // If we had an expired stream URL, clear it
    if (link.streamUrl && storedLinksService.isStreamUrlLikelyExpired(link)) {
      console.warn('🕐 Stream URL is likely expired, will fetch a new one');
      const clearedData = {
        streamUrl: undefined,
        streamUrlCachedAt: undefined,
        error: undefined,
      };

      storedLinksService.updateStoredLinkSync(link.id, clearedData);

      // Update the local state immediately
      setStoredLinks((prevLinks) =>
        prevLinks.map((l) => (l.id === link.id ? { ...l, ...clearedData } : l))
      );
    }

    if (!link.url.toLowerCase().startsWith('magnet:')) {
      // For non-magnet links, try to open safely in new tab
      try {
        const newWindow = window.open(
          link.url,
          '_blank',
          'noopener,noreferrer'
        );
        if (!newWindow) {
          console.warn('⚠️ Popup blocked or failed to open link');
          // Fallback: show an alert with the URL so user can copy it
          alert(
            `Unable to open link automatically. Please copy this URL:\n\n${link.url}`
          );
        }
      } catch (error) {
        console.error('❌ Error opening link:', error);
        // Fallback: show an alert with the URL so user can copy it
        alert(`Error opening link. Please copy this URL:\n\n${link.url}`);
      }
      return;
    }

    // For magnet links, try to get stream URL
    setProcessingLinks((prev) => new Set(prev).add(link.id));

    try {
      const streamResult = await realDebridService.getStreamableVideoUrl(
        link.url
      );

      // Update the cached link with stream URL
      const updatedLinkData = {
        streamUrl: streamResult.streamUrl,
        streamUrlCachedAt: new Date().toISOString(),
        isStreaming: true,
        error: undefined,
        supportsRangeRequests: streamResult.supportsRangeRequests,
        filename: streamResult.filename,
      };

      storedLinksService.updateStoredLinkSync(link.id, updatedLinkData);

      // Update the local state immediately for better UX
      setStoredLinks((prevLinks) =>
        prevLinks.map((l) =>
          l.id === link.id ? { ...l, ...updatedLinkData } : l
        )
      );

      // Start playing
      const sanitizedUrl = sanitizeStreamUrl(streamResult.streamUrl);
      setCurrentStreamUrl(sanitizedUrl);
      setCurrentVideoTitle(
        streamResult.filename || link.title || 'Cached Stream'
      );
      setCurrentSupportsRangeRequests(
        streamResult.supportsRangeRequests ?? true
      );
      setVideoPlayerOpen(true);
    } catch (error: any) {
      console.error('Error getting stream URL:', error);

      // Update the cached link with error
      const errorData = {
        error: error.message || 'Failed to prepare stream',
      };

      storedLinksService.updateStoredLinkSync(link.id, errorData);

      // Update the local state immediately for better UX
      setStoredLinks((prevLinks) =>
        prevLinks.map((l) => (l.id === link.id ? { ...l, ...errorData } : l))
      );
    } finally {
      setProcessingLinks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(link.id);
        return newSet;
      });
    }
  };

  const handleRetryStream = async (link: StoredLink) => {
    // Clear previous error and retry
    storedLinksService.updateStoredLinkSync(link.id, {
      error: undefined,
    });
    // Don't call loadStoredLinks() here to avoid potential refresh issues

    // Wait a bit then try streaming
    setTimeout(() => {
      handleStreamLink(link);
    }, 100);
  };

  const handleOpenOriginalLink = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return <LoadingSpinner message='Loading cached links...' />;
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
            <Typography variant='h4' component='h1' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinkIcon />
              Cached Links
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              ({pagination.totalCount}{' '}
              {pagination.totalCount === 1 ? 'link' : 'links'})
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Content */}
      {pagination.totalCount === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant='h6' color='text.secondary' gutterBottom>
            No cached links yet
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
            Use the link caching section on the search page to add links for
            quick access
          </Typography>
          <Button variant='contained' onClick={onBack}>
            Back to Search
          </Button>
        </Paper>
      ) : (
        <>
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
            
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalResults={pagination.totalCount}
                onPageChange={handlePageChange}
                loading={loading}
              />
            )}
          </Box>

          {/* Show summary of issues and force refresh button for magnet links */}
          {(() => {
            const magnetLinks = storedLinks.filter((link) =>
              link.url.toLowerCase().startsWith('magnet:')
            );
            const linksWithIssues = storedLinks.filter(
              (link) =>
                storedLinksService.hasIssues &&
                storedLinksService.hasIssues(link)
            );
            const expiredLinks = storedLinks.filter(
              (link) =>
                link.streamUrl &&
                storedLinksService.isStreamUrlLikelyExpired(link)
            );
            const errorLinks = storedLinks.filter((link) => link.error);

            // Show alert if there are issues OR if there are magnet links (to show refresh button)
            if (linksWithIssues.length > 0 || magnetLinks.length > 0) {
              return (
                <Alert
                  severity={linksWithIssues.length > 0 ? 'info' : 'success'}
                  sx={{ mb: 3 }}
                  action={
                    magnetLinks.length > 0 ? (
                      <Button
                        color='inherit'
                        size='small'
                        disabled={loading}
                        onClick={async () => {
                          setLoading(true);
                          try {

                            // Pass the current page's links to refresh only those
                            const result =
                              await storedLinksService.refreshExpiredStreamUrls(storedLinks);

                            // Show user feedback
                            if (result.refreshed > 0 && result.failed === 0) {
                              alert(`Successfully refreshed ${result.refreshed} stream URL${result.refreshed > 1 ? 's' : ''}`);
                            } else if (result.refreshed > 0 && result.failed > 0) {
                              alert(`Refreshed ${result.refreshed} stream URL${result.refreshed > 1 ? 's' : ''}, but ${result.failed} failed`);
                            } else if (result.failed > 0) {
                              alert(`Failed to refresh ${result.failed} stream URL${result.failed > 1 ? 's' : ''}`);
                            } else if (result.refreshed === 0) {
                              alert(`No magnet links to refresh on this page`);
                            }

                            refreshStoredLinks(); // Reload the list
                          } catch (error) {
                            console.error('❌ Error refreshing stream URLs:', error);
                            alert('Failed to refresh stream URLs. Please try again.');
                          } finally {
                            setLoading(false);
                          }
                        }}>
                        {loading ? 'Refreshing...' : 'Force Refresh All Stream URLs'}
                      </Button>
                    ) : undefined
                  }>
                  <Typography variant='body2'>
                    {errorLinks.length > 0 &&
                      `${errorLinks.length} links have errors. `}
                    {expiredLinks.length > 0 &&
                      `${expiredLinks.length} links have expired stream URLs. `}
                    {magnetLinks.length > 0 &&
                      `${magnetLinks.length} magnet link${magnetLinks.length > 1 ? 's' : ''} on this page. `}
                    Click "Force Refresh" to regenerate all stream URLs.
                  </Typography>
                </Alert>
              );
            }
            return null;
          })()}

          <Grid container spacing={2}>
            {Array.isArray(storedLinks) &&
              storedLinks.map((link) => {
                if (!link || typeof link !== 'object' || !link.id) {
                  console.warn('Invalid cached link object:', link);
                  return null;
                }

                const isProcessing = processingLinks.has(link.id);

                return (
                  <Grid key={link.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <StoredLinkCard
                      cachedLink={link}
                      onPlay={handleStreamLink}
                      onRetry={handleRetryStream}
                      onOpenOriginal={handleOpenOriginalLink}
                      onDelete={handleRemoveLink}
                      isProcessing={isProcessing}
                    />
                  </Grid>
                );
              })}
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
            
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalResults={pagination.totalCount}
                onPageChange={handlePageChange}
                loading={loading}
              />
            )}
          </Box>

          {/* Show info about cached links */}
          <Alert severity='info' sx={{ mt: 3 }}>
            💡 Your cached links are stored locally in your browser. Magnet
            links can be streamed instantly once processed. Click the heart icon
            to add links to your favorites!
          </Alert>
        </>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        open={videoPlayerOpen}
        onClose={() => setVideoPlayerOpen(false)}
        videoUrl={currentStreamUrl}
        filename={currentVideoTitle}
        loading={false}
        supportsRangeRequests={currentSupportsRangeRequests}
      />
    </Container>
  );
};

export default StoredLinksPage;
