import React, { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Alert,
  Button,
} from '@mui/material';
import {
  Article as ArticleIcon,
  Folder as FolderIcon,
  Image as ImageIcon,
  OpenInNew as OpenInNewIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { isManualImageInputEnabled } from '../../utils/featureFlags';
import { Torrent } from '../../types/Torrent';
import GoogleImagesSearch from '../GoogleImagesSearch';
import ManualImageInput from '../ManualImageInput';

interface TorrentDetailsData {
  description: string;
  files: { name: string; size: string }[];
  comments: { author: string; comment: string; date: string }[];
  images: { originalUrl: string; directUrl: string }[];
  magnet?: string;
  hash?: string;
  error?: string;
}

interface TorrentDetailsContentProps {
  torrent: Torrent; // Add torrent prop for Google Images search
  torrentDetails: TorrentDetailsData | null;
  loadingDetails: boolean;
  detailsError: string | null;
  onForceRefresh: () => void;
  onImageClick: (index: number) => void;
  onImagesUpdate?: (
    images: { originalUrl: string; directUrl: string }[]
  ) => void;
}

const TorrentDetailsContent: React.FC<TorrentDetailsContentProps> = ({
  torrent,
  torrentDetails,
  loadingDetails,
  detailsError,
  onForceRefresh,
  onImageClick,
  onImagesUpdate,
}) => {
  const [manualImages, setManualImages] = useState<
    { originalUrl: string; directUrl: string }[]
  >([]);

  // Combine torrent details images with manual images
  const allImages = useMemo(
    () => [...(torrentDetails?.images || []), ...manualImages],
    [torrentDetails?.images, manualImages]
  );

  // Notify parent component when images change
  useEffect(() => {
    if (onImagesUpdate) {
      onImagesUpdate(allImages);
    }
  }, [allImages, onImagesUpdate]);

  const handleManualImagesChanged = (images: any[]) => {
    // Convert manual images to the same format as torrent details images
    const formattedImages = images.map((img) => ({
      originalUrl: img.originalUrl,
      directUrl: img.directUrl,
    }));
    setManualImages(formattedImages);
  };

  const handleImageClick = (index: number) => {
    // Adjust index to account for all images combined
    onImageClick(index);
  };
  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <DescriptionIcon color='primary' />
        <Typography variant='h6' color='primary'>
          Torrent Details
        </Typography>
      </Box>

      {loadingDetails && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 2,
          }}>
          <CircularProgress size={20} />
          <Typography variant='body2' color='text.secondary'>
            Loading torrent details...
          </Typography>
        </Box>
      )}

      {detailsError && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {detailsError}
          <Button size='small' onClick={onForceRefresh} sx={{ ml: 1 }}>
            Retry
          </Button>
        </Alert>
      )}

      {torrentDetails && !loadingDetails && (
        <Box>
          {/* Description Section */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1,
              }}>
              <ArticleIcon />
              <Typography variant='subtitle1' fontWeight='bold'>
                Description
              </Typography>
            </Box>
            <Typography
              variant='body2'
              sx={{
                whiteSpace: 'pre-wrap',
                backgroundColor: 'action.hover',
                p: 2,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
              {torrentDetails.description || 'No description available'}
            </Typography>
          </Box>

          {/* Images Section */}
          {allImages && allImages.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                }}>
                <ImageIcon />
                <Typography variant='subtitle1' fontWeight='bold'>
                  Images ({allImages.length})
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 1,
                  maxHeight: '200px',
                  overflow: 'auto',
                }}>
                {allImages.map((image, index) => (
                  <Box
                    key={`${image.originalUrl}-${index}`}
                    sx={{
                      position: 'relative',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    }}>
                    <img
                      src={image.directUrl}
                      alt={`Image ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100px',
                        objectFit: 'cover',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleImageClick(index)}
                      onError={(e) => {
                        // Fallback to original URL if direct URL fails
                        const target = e.target as HTMLImageElement;
                        if (target.src !== image.originalUrl) {
                          target.src = image.originalUrl;
                        } else {
                          // Hide image if both URLs fail
                          target.style.display = 'none';
                        }
                      }}
                    />
                    {/* Overlay icon to indicate it's clickable */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                        '.MuiBox-root:hover &': {
                          opacity: 1,
                        },
                      }}>
                      <OpenInNewIcon
                        sx={{
                          fontSize: 14,
                          color: 'white',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Google Images Search Section - Inline search with results */}
          <GoogleImagesSearch torrent={torrent} />

          {/* Manual Image Input Section */}
          {isManualImageInputEnabled() && (
            <ManualImageInput
              torrent={torrent}
              onImagesChanged={handleManualImagesChanged}
            />
          )}

          {/* Files Section - Show only first few */}
          {torrentDetails.files && torrentDetails.files.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                }}>
                <FolderIcon />
                <Typography variant='subtitle1' fontWeight='bold'>
                  Files ({torrentDetails.files.length})
                </Typography>
              </Box>
              <List dense sx={{ maxHeight: '150px', overflow: 'auto' }}>
                {torrentDetails.files.slice(0, 5).map((file, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={file.name}
                      secondary={file.size}
                      primaryTypographyProps={{
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                      }}
                      secondaryTypographyProps={{
                        fontSize: '0.7rem',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
              {torrentDetails.files.length > 5 && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mt: 1, display: 'block' }}>
                  Showing first 5 of {torrentDetails.files.length} files
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default TorrentDetailsContent;
