import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { Torrent } from '../types/Torrent';
import { coverImageService } from '../services/enhancedCoverImageService';
import { realDebridService } from '../services/realDebridService';
import { useTorrentDetails } from '../hooks/useTorrentDetails';
import { useVideoStreaming } from '../hooks/useVideoStreaming';
import { isVideoCategory } from '../utils/categoryUtils';
import { magnetCacheService } from '../utils/magnetCache';
import { VideoPlayerModal } from './VideoPlayerModalVideoJS';
import VideoStreamingErrorBoundary from './VideoStreamingErrorBoundary';

// Import all the new sub-components
import {
  TorrentModalHeader,
  TorrentPosterImage,
  TorrentBasicInfo,
  TorrentHealthStatus,
  TorrentDetailsContent,
  TorrentActions,
  ImageViewerModal,
} from './torrent-details';

interface TorrentDetailsModalProps {
  torrent: Torrent | null;
  open: boolean;
  onClose: () => void;
}

export const TorrentDetailsModal: React.FC<TorrentDetailsModalProps> = ({
  torrent,
  open,
  onClose,
}) => {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [coverSetSnackbar, setCoverSetSnackbar] = useState(false);
  const [coverErrorSnackbar, setCoverErrorSnackbar] = useState(false);
  const [currentTorrent, setCurrentTorrent] = useState<Torrent | null>(null);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [combinedImages, setCombinedImages] = useState<
    { originalUrl: string; directUrl: string }[]
  >([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Use the custom hook for torrent details
  const { torrentDetails, loadingDetails, detailsError, forceRefreshDetails } =
    useTorrentDetails(currentTorrent, open);

  // Use the video streaming hook
  const {
    streamUrl,
    filename,
    isLoading: isStreamLoading,
    error: streamError,
    startStreaming,
    regenerateStreamLink,
    resetStreaming,
    supportsRangeRequests,
  } = useVideoStreaming();

  // Update current torrent when modal opens
  React.useEffect(() => {
    if (open && torrent) {
      setCurrentTorrent(torrent);
    } else {
      setCurrentTorrent(null);
      // Reset streaming state when modal closes
      resetStreaming();
      setVideoPlayerOpen(false);
    }
  }, [open, torrent, resetStreaming]);

  // Open video player when stream is ready
  React.useEffect(() => {
    if (streamUrl && filename) {
      setVideoPlayerOpen(true);
    }
  }, [streamUrl, filename]);

  // Create enriched torrent with magnet from details if not present
  // Must be before the early return to follow React's Rules of Hooks
  const enrichedTorrent: Torrent | null = React.useMemo(() => {
    if (!torrent) return null;
    const magnetLink = torrent.Magnet || torrentDetails?.magnet;
    return magnetLink ? { ...torrent, Magnet: magnetLink } : torrent;
  }, [torrent, torrentDetails?.magnet]);

  // Cache the magnet link when it's fetched from details
  React.useEffect(() => {
    if (torrent?.Source && torrent?.Url && torrentDetails?.magnet) {
      magnetCacheService.cache(torrent.Source, torrent.Url, torrentDetails.magnet);
    }
  }, [torrent?.Source, torrent?.Url, torrentDetails?.magnet]);

  if (!torrent || !enrichedTorrent) return null;

  const handleMagnetClick = () => {
    if (enrichedTorrent.Magnet) {
      window.open(enrichedTorrent.Magnet, '_blank');
    }
  };

  const handleUrlClick = () => {
    if (torrent.Url) {
      window.open(torrent.Url, '_blank');
    }
  };

  const handlePlayClick = () => {
    if (enrichedTorrent.Magnet) {
      startStreaming(enrichedTorrent.Magnet);
    }
  };

  const handleDownloadClick = async () => {
    if (!enrichedTorrent.Magnet) return;
    setDownloadLoading(true);
    setDownloadError(null);
    try {
      const result = await realDebridService.getStreamableVideoUrl(enrichedTorrent.Magnet);
      window.open(result.streamUrl, '_blank');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get download link';
      setDownloadError(message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleVideoPlayerClose = () => {
    setVideoPlayerOpen(false);
    resetStreaming();
  };

  const handleCacheClear = () => {
    if (enrichedTorrent.Magnet) {
      realDebridService.clearCachedStreamUrl(enrichedTorrent.Magnet);
      forceRefreshDetails();
    }
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  const handleSetAsCover = async (imageUrl: string, originalUrl: string) => {
    if (currentTorrent) {
      try {
        await coverImageService.setCoverImage(
          currentTorrent,
          imageUrl,
          originalUrl
        );
        setCoverSetSnackbar(true);
      } catch (error) {
        console.error('Error setting cover image:', error);
        setCoverErrorSnackbar(true);
      }
    }
  };

  const handleRemoveCover = async () => {
    if (currentTorrent) {
      const removed = await coverImageService.removeCoverImage(currentTorrent);
      if (removed) {
        setCurrentTorrent({ ...currentTorrent });
      }
    }
  };

  const handleImageChange = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleImagesUpdate = (
    images: { originalUrl: string; directUrl: string }[]
  ) => {
    setCombinedImages(images);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth='md'
        fullWidth
        PaperProps={{
          sx: { minHeight: '400px' },
        }}>
        <TorrentModalHeader
          torrent={torrent}
          onClose={onClose}
          onForceRefresh={forceRefreshDetails}
          onRemoveCover={handleRemoveCover}
        />

        <DialogContent sx={{ p: 0 }}>
          {/* Poster Image */}
          <TorrentPosterImage torrent={currentTorrent || torrent} />

          <Box sx={{ px: 3 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
              }}>
              {/* Basic Information */}
              <Box sx={{ flex: 1 }}>
                <TorrentBasicInfo torrent={torrent} />
              </Box>

              {/* Health Information */}
              <Box sx={{ flex: 1 }}>
                <TorrentHealthStatus torrent={torrent} />
              </Box>
            </Box>

            {/* Torrent Description and Details */}
            <Box sx={{ mt: 3 }}>
              {torrent.Source &&
                ['piratebay', 'limetorrent', 'cached-links', '1337x'].includes(
                  torrent.Source.toLowerCase()
                ) && (
                  <TorrentDetailsContent
                    torrent={torrent}
                    torrentDetails={torrentDetails}
                    loadingDetails={loadingDetails}
                    detailsError={detailsError}
                    onForceRefresh={forceRefreshDetails}
                    onImageClick={handleImageClick}
                    onImagesUpdate={handleImagesUpdate}
                  />
                )}{' '}
              {/* Message for sources that don't support detailed views */}
              {torrent.Source &&
                !['piratebay', 'limetorrent', 'cached-links', '1337x'].includes(
                  torrent.Source.toLowerCase()
                ) && (
                  <Alert severity='info' sx={{ p: 2 }}>
                    Detailed torrent information (description, files, comments)
                    is not available for {torrent.Source} torrents. Only basic
                    information and download links are provided.
                  </Alert>
                )}
            </Box>

            {/* Additional Details */}
            {(enrichedTorrent.Magnet || torrent.Url || torrentDetails?.magnet) && (
              <Box sx={{ mt: 3 }}>
                <TorrentActions
                  torrent={enrichedTorrent}
                  onMagnetClick={handleMagnetClick}
                  onUrlClick={handleUrlClick}
                  onPlayClick={handlePlayClick}
                  isVideoCategory={isVideoCategory(torrent.Category)}
                  isStreamLoading={isStreamLoading}
                  onCacheClear={handleCacheClear}
                />
              </Box>
            )}

            {/* Stream Error Alert */}
            {streamError && (
              <Box sx={{ mt: 2 }}>
                <Alert severity='error' onClose={resetStreaming}>
                  {streamError}
                </Alert>
              </Box>
            )}

            {/* Download Error Alert */}
            {downloadError && (
              <Box sx={{ mt: 2 }}>
                <Alert severity='error' onClose={() => setDownloadError(null)}>
                  {downloadError}
                </Alert>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color='inherit'>
            Close
          </Button>
          {enrichedTorrent.Magnet && (
            <Button
              variant='contained'
              onClick={handleDownloadClick}
              disabled={downloadLoading}
              startIcon={downloadLoading ? <CircularProgress size={20} color='inherit' /> : <CloudDownloadIcon />}>
              {downloadLoading ? 'Getting Link...' : 'Download Now'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Image Viewer Modal */}
      {combinedImages.length > 0 && (
        <ImageViewerModal
          images={combinedImages}
          open={imageViewerOpen}
          selectedIndex={selectedImageIndex}
          onClose={() => setImageViewerOpen(false)}
          onSetAsCover={handleSetAsCover}
          onImageChange={handleImageChange}
        />
      )}

      {/* Cover Set Success Snackbar */}
      <Snackbar
        open={coverSetSnackbar}
        autoHideDuration={3000}
        onClose={() => setCoverSetSnackbar(false)}
        message='Cover image set successfully!'
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Cover Set Error Snackbar */}
      <Snackbar
        open={coverErrorSnackbar}
        autoHideDuration={5000}
        onClose={() => setCoverErrorSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity='error' onClose={() => setCoverErrorSnackbar(false)}>
          Failed to set cover image. The image host may block saving. Try another image.
        </Alert>
      </Snackbar>

      {/* Video Player Modal */}
      <VideoStreamingErrorBoundary>
        <VideoPlayerModal
          open={videoPlayerOpen}
          onClose={handleVideoPlayerClose}
          videoUrl={streamUrl || ''}
          filename={filename || ''}
          loading={isStreamLoading}
          supportsRangeRequests={supportsRangeRequests}
          onRetryWithRegeneration={async () => {

            await regenerateStreamLink();
          }}
        />
      </VideoStreamingErrorBoundary>
    </>
  );
};
