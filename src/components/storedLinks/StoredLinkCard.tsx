import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  CardActionArea,
  CircularProgress,
  Tooltip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayCircle as PlayCircleIcon,
  OpenInNew as OpenInNewIcon,
  Link as LinkIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  PlayArrow as PlayArrowIcon,
  CloudDownload as CloudDownloadIcon,
  Image as ImageIcon,
  Wallpaper as WallpaperIcon,
} from '@mui/icons-material';
import {
  StoredLink,
  storedLinksService,
} from '../../services/storedLinksService';
import { favoritesService } from '../../services/favoritesService';
import { Torrent } from '../../types/Torrent';
import { realDebridTorrentInfoService } from '../../services/realDebridTorrentInfoService';
import { coverImageService } from '../../services/enhancedCoverImageService';
import GoogleImagesSearch from '../GoogleImagesSearch';
import ManualImageInput from '../ManualImageInput';

interface StoredLinkCardProps {
  storedLink: StoredLink;
  onPlay: (link: StoredLink) => void;
  onRetry: (link: StoredLink) => void;
  onOpenOriginal: (url: string) => void;
  onDelete: (id: string, event: React.MouseEvent) => void;
  isProcessing: boolean;
}

const StoredLinkCard: React.FC<StoredLinkCardProps> = ({
  cachedLink,
  onPlay,
  onRetry,
  onOpenOriginal,
  onDelete,
  isProcessing,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [enhancedTitle, setEnhancedTitle] = useState<string>('');
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);
  const [titleLoaded, setTitleLoaded] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [currentCoverImage, setCurrentCoverImage] = useState<string | null>(
    null
  );

  const convertToTorrentLike = useCallback(
    (link: StoredLink): Torrent => {
      const displayName = enhancedTitle || link.title || 'Cached Link';
      const torrentLike = {
        Name: displayName,
        Size: 'Unknown',
        DateUploaded: link.dateAdded,
        Category: link.url.toLowerCase().startsWith('magnet:')
          ? 'Video'
          : 'Link',
        Seeders: 'N/A',
        Leechers: 'N/A',
        UploadedBy: 'Cached',
        Url: link.url,
        Magnet: link.url.toLowerCase().startsWith('magnet:') ? link.url : '',
        Source: 'cached-links',
        isStoredLink: true,
        cachedLinkId: link.id,
        // Add additional fields that might be needed for cover image service
        Provider: 'cached-links',
        Hash: link.id, // Use the cached link ID as a unique identifier
      } as Torrent & { isStoredLink: boolean; cachedLinkId: string };

      return torrentLike;
    },
    [enhancedTitle]
  );

  useEffect(() => {
    // Only load enhanced title once per cached link
    if (titleLoaded || !cachedLink.url.toLowerCase().startsWith('magnet:')) {
      return;
    }

    const loadEnhancedTitle = async () => {
      setIsLoadingTitle(true);
      try {
        // Add a random delay to spread out API requests and avoid 429 errors
        const delay = Math.random() * 2000 + 1000; // 1-3 seconds
        await new Promise((resolve) => setTimeout(resolve, delay));

        const extractedTitle =
          await realDebridTorrentInfoService.getEnhancedTitle(cachedLink.url);
        if (extractedTitle) {
          setEnhancedTitle(extractedTitle);
        }
        setTitleLoaded(true); // Mark as loaded to prevent further API calls
      } catch (error) {
        // Error handled silently
        setTitleLoaded(true); // Even on error, mark as loaded to prevent retries
      } finally {
        setIsLoadingTitle(false);
      }
    };

    loadEnhancedTitle();
  }, [cachedLink.url, titleLoaded]);

  // Cover image loading - optimized to load only once and prevent constant API calls
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  
  useEffect(() => {
    // Only load cover image once per cached link
    if (coverImageLoaded) return;

    const loadCoverImage = async () => {
      const torrentLike = convertToTorrentLike(cachedLink);

      try {
        const existingCover = await coverImageService.getCoverImageAsync(
          torrentLike
        );

        setCurrentCoverImage(existingCover);
        setCoverImageLoaded(true); // Mark as loaded to prevent further API calls
      } catch (error) {
        console.warn('🖼️ [StoredLinkCard] Error loading cover image:', error);
        setCoverImageLoaded(true); // Even on error, mark as loaded to prevent retries
      }
    };

    loadCoverImage();
  }, [cachedLink.id, coverImageLoaded, convertToTorrentLike]); // Only depend on cachedLink.id, not the entire object

  // Debug: Log when currentCoverImage changes
  useEffect(() => {
    if (currentCoverImage) {
      // Cover image loaded
    }
  }, [currentCoverImage]);

  useEffect(() => {
    const torrentLike = convertToTorrentLike(cachedLink);
    setIsFavorite(favoritesService.isFavoriteSync(torrentLike));
  }, [cachedLink, enhancedTitle, convertToTorrentLike]);

  // Removed constant polling for cover images - this was causing constant API calls
  // Cover images will be loaded once on mount and updated only when manually changed

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const torrentLike = convertToTorrentLike(cachedLink);

    const wasToggled = favoritesService.toggleFavoriteSync(torrentLike);

    if (wasToggled) {
      // Update the state immediately for better UX
      const newFavoriteState = favoritesService.isFavoriteSync(torrentLike);
      setIsFavorite(newFavoriteState);

    } else {

    }
  };

  const handleOpenImageSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageSearchOpen(true);
  };

  const handleCloseImageSearch = () => {
    setImageSearchOpen(false);
  };

  const handleImageSelect = async (imageUrl: string, originalUrl: string) => {
    try {
      const torrentLike = convertToTorrentLike(cachedLink);
      await coverImageService.setCoverImage(torrentLike, imageUrl, originalUrl);

      // Update the current cover image state
      setCurrentCoverImage(imageUrl);

      // Close the dialog
      setImageSearchOpen(false);

    } catch (error) {
      console.error('Error setting cover image for cached link:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  const getLinkTypeChip = () => {
    if (cachedLink.error) {
      return (
        <Chip icon={<ErrorIcon />} label='Error' color='error' size='small' />
      );
    }

    if (cachedLink.url.toLowerCase().startsWith('magnet:')) {
      // Check if stream URL exists and is not expired
      const hasValidStreamUrl =
        cachedLink.streamUrl &&
        !storedLinksService.isStreamUrlLikelyExpired(cachedLink);

      return (
        <Chip
          icon={hasValidStreamUrl ? <CheckCircleIcon /> : <PlayArrowIcon />}
          label={hasValidStreamUrl ? 'Ready to Stream' : 'Magnet Link'}
          color={hasValidStreamUrl ? 'success' : 'primary'}
          size='small'
        />
      );
    }

    return (
      <Chip
        icon={<LinkIcon />}
        label='Web Link'
        color='secondary'
        size='small'
      />
    );
  };

  const isMagnet = cachedLink.url.toLowerCase().startsWith('magnet:');
  const displayTitle = enhancedTitle || cachedLink.title || 'Untitled Link';

  return (
    <>
      <Card
        elevation={2}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s ease-in-out',
          position: 'relative',
          '&:hover': {
            elevation: 4,
            transform: 'translateY(-2px)',
          },
          // Add cover image background if available
          ...(currentCoverImage && {
            backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url("${currentCoverImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#1976d2', // Fallback color to see if styling is applied
            color: 'white',
            // Debug: Add a border to see if the styling is being applied
            border:
              process.env.NODE_ENV === 'development' ? '2px solid red' : 'none',
          }),
        }}>
        {/* Cover image indicator */}
        {currentCoverImage && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 2,
            }}>
            <Chip
              icon={<ImageIcon />}
              label={`Cover (${
                currentCoverImage.length > 50 ? 'URL' : 'Short'
              })`}
              size='small'
              sx={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: 'black',
              }}
              title={currentCoverImage} // Show the URL on hover for debugging
            />
          </Box>
        )}

        <CardActionArea
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // Don't automatically trigger play on card click to prevent page reloading
            // Users should use the specific action buttons instead
          }}
          sx={{ flexGrow: 1, cursor: 'default' }}
          disabled={isProcessing}>
          <CardContent
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with chips and actions */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 2,
              }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {getLinkTypeChip()}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {isMagnet && (
                  <>
                    <Tooltip title='Add cover image'>
                      <IconButton
                        size='small'
                        type='button'
                        onClick={handleOpenImageSearch}
                        sx={{
                          color: currentCoverImage ? 'white' : 'default',
                          backgroundColor: currentCoverImage
                            ? 'rgba(0,0,0,0.5)'
                            : 'transparent',
                          '&:hover': {
                            backgroundColor: currentCoverImage
                              ? 'rgba(0,0,0,0.7)'
                              : 'rgba(0,0,0,0.1)',
                          },
                        }}>
                        <WallpaperIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>

                  </>
                )}

                <Tooltip
                  title={
                    isFavorite ? 'Remove from favorites' : 'Add to favorites'
                  }>
                  <IconButton
                    size='small'
                    type='button'
                    onClick={handleToggleFavorite}
                    sx={{
                      color: isFavorite
                        ? 'error'
                        : currentCoverImage
                        ? 'white'
                        : 'default',
                      backgroundColor: currentCoverImage
                        ? 'rgba(0,0,0,0.5)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: currentCoverImage
                          ? 'rgba(0,0,0,0.7)'
                          : 'rgba(0,0,0,0.1)',
                      },
                    }}>
                    {isFavorite ? (
                      <FavoriteIcon fontSize='small' />
                    ) : (
                      <FavoriteBorderIcon fontSize='small' />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title='Delete link'>
                  <IconButton
                    size='small'
                    color='error'
                    type='button'
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        onDelete(cachedLink.id, e);
                      } catch (error) {
                        console.error('Error deleting cached link:', error);
                      }
                    }}
                    sx={{
                      backgroundColor: currentCoverImage
                        ? 'rgba(0,0,0,0.5)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: currentCoverImage
                          ? 'rgba(0,0,0,0.7)'
                          : 'rgba(0,0,0,0.1)',
                      },
                    }}>
                    <DeleteIcon fontSize='small' />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Title */}
            <Box sx={{ position: 'relative', mb: 1 }}>
              <Typography
                variant='h6'
                component='h3'
                sx={{
                  wordBreak: 'break-word',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  color: currentCoverImage ? 'white' : 'inherit',
                  textShadow: currentCoverImage
                    ? '1px 1px 2px rgba(0,0,0,0.8)'
                    : 'none',
                }}>
                {displayTitle}
              </Typography>

              {isLoadingTitle && isMagnet && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 0.5,
                  }}>
                  <CircularProgress size={12} />
                  <Typography
                    variant='caption'
                    sx={{
                      color: currentCoverImage
                        ? 'rgba(255,255,255,0.8)'
                        : 'text.secondary',
                    }}>
                    Loading title...
                  </Typography>
                </Box>
              )}
            </Box>

            {/* URL Preview */}
            <Typography
              variant='body2'
              sx={{
                mb: 2,
                wordBreak: 'break-all',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                opacity: 0.8,
                color: currentCoverImage
                  ? 'rgba(255,255,255,0.8)'
                  : 'text.secondary',
              }}>
              {cachedLink.url}
            </Typography>

            {/* Date */}
            <Typography
              variant='caption'
              sx={{
                mb: 2,
                color: currentCoverImage
                  ? 'rgba(255,255,255,0.8)'
                  : 'text.secondary',
              }}>
              Added: {formatDate(cachedLink.dateAdded)}
            </Typography>

            {/* Error Display */}
            {cachedLink.error && (
              <Alert severity='error' sx={{ mt: 1, fontSize: '0.75rem' }}>
                {typeof cachedLink.error === 'string'
                  ? cachedLink.error
                  : 'An error occurred'}
              </Alert>
            )}

            {/* Stream URL Status for Magnet Links */}
            {isMagnet &&
              cachedLink.streamUrl &&
              storedLinksService.isStreamUrlLikelyExpired(cachedLink) && (
                <Alert severity='warning' sx={{ mt: 1, fontSize: '0.75rem' }}>
                  Stream URL may be expired. Click play to refresh.
                </Alert>
              )}

            {/* Processing Indicator */}
            {isProcessing && (
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CircularProgress size={16} />
                <Typography
                  variant='caption'
                  sx={{
                    color: currentCoverImage
                      ? 'rgba(255,255,255,0.8)'
                      : 'text.secondary',
                  }}>
                  Processing...
                </Typography>
              </Box>
            )}

            {/* Action Buttons */}
            <Box
              sx={{
                mt: 'auto',
                pt: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {isMagnet ? (
                  <>
                    <Tooltip
                      title={
                        cachedLink.streamUrl
                          ? storedLinksService.isStreamUrlLikelyExpired(
                              cachedLink
                            )
                            ? 'Refresh expired stream'
                            : 'Play video'
                          : isMagnet
                          ? 'Prepare stream'
                          : 'Open link'
                      }>
                      <IconButton
                        color={cachedLink.streamUrl ? 'success' : 'primary'}
                        disabled={isProcessing}
                        type='button'
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          try {
                            await onPlay(cachedLink);
                          } catch (error) {
                            console.error('❌ Error in onPlay:', error);
                            // Prevent any error from causing page navigation
                            return false;
                          }
                        }}>
                        {isProcessing ? (
                          <CircularProgress size={24} />
                        ) : cachedLink.streamUrl ? (
                          storedLinksService.isStreamUrlLikelyExpired(
                            cachedLink
                          ) ? (
                            <RefreshIcon />
                          ) : (
                            <PlayCircleIcon />
                          )
                        ) : isMagnet ? (
                          <CloudDownloadIcon />
                        ) : (
                          <OpenInNewIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                    {(cachedLink.error ||
                      (cachedLink.streamUrl &&
                        storedLinksService.isStreamUrlLikelyExpired(
                          cachedLink
                        ))) && (
                      <Tooltip
                        title={
                          cachedLink.error ? 'Retry' : 'Refresh expired stream'
                        }>
                        <IconButton
                          color='warning'
                          disabled={isProcessing}
                          type='button'
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              if (cachedLink.error) {
                                await onRetry(cachedLink);
                              } else {
                                // For expired streams, clear the stream URL and retry

                                storedLinksService.updateStoredLinkSync(
                                  cachedLink.id,
                                  {
                                    streamUrl: undefined,
                                    streamUrlCachedAt: undefined,
                                    error: undefined,
                                  }
                                );
                                // Create a new link object without the stream URL to pass to onPlay
                                const linkWithoutStreamUrl = {
                                  ...cachedLink,
                                  streamUrl: undefined,
                                  streamUrlCachedAt: undefined,
                                  error: undefined,
                                };
                                await onPlay(linkWithoutStreamUrl);
                              }
                            } catch (error) {
                              console.error('Error in refresh/retry:', error);
                            }
                          }}>
                          <RefreshIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                ) : (
                  <Tooltip title='Open link'>
                    <IconButton
                      color='primary'
                      type='button'
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          onOpenOriginal(cachedLink.url);
                        } catch (error) {
                          console.error('Error opening original link:', error);
                        }
                      }}>
                      <OpenInNewIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              <Tooltip title='Open original link'>
                <IconButton
                  size='small'
                  type='button'
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      onOpenOriginal(cachedLink.url);
                    } catch (error) {
                      console.error('Error opening original link:', error);
                    }
                  }}
                  sx={{
                    color: currentCoverImage ? 'white' : 'default',
                    backgroundColor: currentCoverImage
                      ? 'rgba(0,0,0,0.5)'
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: currentCoverImage
                        ? 'rgba(0,0,0,0.7)'
                        : 'rgba(0,0,0,0.1)',
                    },
                  }}>
                  <LinkIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>

      {/* Image Search Modal */}
      <Dialog
        open={imageSearchOpen}
        onClose={handleCloseImageSearch}
        maxWidth='lg'
        fullWidth>
        <DialogTitle>Add Cover Image - {displayTitle}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <GoogleImagesSearch
              torrent={convertToTorrentLike(cachedLink)}
              onImageSelect={handleImageSelect}
            />
          </Box>
          <Box>
            <ManualImageInput
              torrent={convertToTorrentLike(cachedLink)}
              onImageAdded={handleImageSelect}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImageSearch}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StoredLinkCard;
