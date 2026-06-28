import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Wallpaper as WallpaperIcon,
  OpenInNew as OpenInNewIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

interface GoogleImageResult {
  url: string;
  title: string;
  thumbnail: string;
  width: number;
  height: number;
  source: string;
}

interface GoogleImagesGalleryProps {
  open: boolean;
  onClose: () => void;
  images: GoogleImageResult[];
  initialIndex?: number;
  onSetAsCover?: (imageUrl: string, originalUrl: string) => void;
  searchQuery?: string;
}

const GoogleImagesGallery: React.FC<GoogleImagesGalleryProps> = ({
  open,
  onClose,
  images,
  initialIndex = 0,
  onSetAsCover,
  searchQuery = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'gallery' | 'single'>('single');

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setImageLoading(true);
      setViewMode('single');
    }
  }, [open, initialIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setImageLoading(true);
    setZoom(1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setImageLoading(true);
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleSetAsCover = () => {
    if (onSetAsCover && images[currentIndex]) {
      const image = images[currentIndex];
      onSetAsCover(image.url, image.url);
    }
  };

  const handleOpenOriginal = () => {
    if (images[currentIndex]) {
      window.open(images[currentIndex].url, '_blank');
    }
  };

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setViewMode('single');
    setImageLoading(true);
    setZoom(1);
  };

  if (!images.length) return null;

  const currentImage = images[currentIndex];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0, 0, 0, 0.95)',
          backgroundImage: 'none',
          height: '90vh',
        },
      }}>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'white',
          pb: 1,
        }}>
        <Box>
          <Typography variant='h6' component='div' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImageIcon />
            {searchQuery ? `${searchQuery} - ` : ''}Image Gallery
          </Typography>
          {viewMode === 'single' && (
            <Typography variant='caption' color='rgba(255, 255, 255, 0.7)'>
              Image {currentIndex + 1} of {images.length} • {currentImage.width}{' '}
              × {currentImage.height}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <Button
            size='small'
            onClick={() =>
              setViewMode(viewMode === 'single' ? 'gallery' : 'single')
            }
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}>
            {viewMode === 'single' ? 'Gallery View' : 'Single View'}
          </Button>

          {viewMode === 'single' && (
            <>
              {/* Set as Cover Button */}
              {onSetAsCover && (
                <Tooltip title='Set as cover image'>
                  <IconButton
                    onClick={handleSetAsCover}
                    sx={{
                      color: 'white',
                      backgroundColor: 'rgba(46, 125, 50, 0.8)',
                      '&:hover': {
                        backgroundColor: 'rgba(46, 125, 50, 1)',
                      },
                    }}>
                    <WallpaperIcon />
                  </IconButton>
                </Tooltip>
              )}

              {/* Open Original Button */}
              <Tooltip title='Open full size in new tab'>
                <IconButton
                  onClick={handleOpenOriginal}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(25, 118, 210, 0.8)',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 1)',
                    },
                  }}>
                  <OpenInNewIcon />
                </IconButton>
              </Tooltip>

              {/* Zoom Controls */}
              <IconButton
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                sx={{ color: 'white' }}>
                <ZoomOutIcon />
              </IconButton>

              <IconButton onClick={handleResetZoom} sx={{ color: 'white' }}>
                <FitScreenIcon />
              </IconButton>

              <IconButton
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                sx={{ color: 'white' }}>
                <ZoomInIcon />
              </IconButton>
            </>
          )}

          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{ p: 0, overflow: 'hidden', bgcolor: 'rgba(0, 0, 0, 0.95)' }}>
        {viewMode === 'single' ? (
          <>
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <IconButton
                  onClick={handlePrevious}
                  sx={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                    },
                    zIndex: 1,
                  }}>
                  <ArrowBackIcon />
                </IconButton>

                <IconButton
                  onClick={handleNext}
                  sx={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                    },
                    zIndex: 1,
                  }}>
                  <ArrowForwardIcon />
                </IconButton>
              </>
            )}

            {/* Main Image */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                width: '100%',
                overflow: 'auto',
                cursor: zoom > 1 ? 'grab' : 'default',
                '&:active': {
                  cursor: zoom > 1 ? 'grabbing' : 'default',
                },
              }}>
              {imageLoading && (
                <CircularProgress
                  sx={{
                    position: 'absolute',
                    color: 'white',
                  }}
                  size={50}
                />
              )}
              <img
                src={currentImage.url}
                alt={currentImage.title}
                style={{
                  maxWidth: zoom > 1 ? 'none' : '100%',
                  maxHeight: zoom > 1 ? 'none' : '100%',
                  transform: `scale(${zoom})`,
                  transition: 'transform 0.2s ease',
                  objectFit: 'contain',
                  opacity: imageLoading ? 0 : 1,
                }}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            </Box>

            {/* Image Info */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                right: 16,
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                p: 2,
                borderRadius: 1,
              }}>
              <Typography variant='body2' sx={{ mb: 0.5 }}>
                {currentImage.title}
              </Typography>
              <Typography variant='caption' color='rgba(255, 255, 255, 0.7)'>
                Source: {currentImage.source} • {currentImage.width} ×{' '}
                {currentImage.height}
              </Typography>
            </Box>
          </>
        ) : (
          /* Gallery Grid View */
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 2,
              }}>
              {images.map((image, index) => (
                <Paper
                  elevation={3}
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    borderRadius: 1,
                    overflow: 'hidden',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    border:
                      index === currentIndex
                        ? '2px solid #1976d2'
                        : '2px solid transparent',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      boxShadow: 6,
                      '& .image-overlay': {
                        opacity: 1,
                      },
                    },
                  }}
                  onClick={() => handleImageClick(index)}>
                  <img
                    src={image.thumbnail}
                    alt={image.title}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                    }}
                  />

                  {/* Image Overlay */}
                  <Box
                    className='image-overlay'
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                    }}>
                    {onSetAsCover && (
                      <Tooltip title='Set as cover'>
                        <IconButton
                          size='small'
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetAsCover(image.url, image.url);
                          }}
                          sx={{
                            color: 'white',
                            backgroundColor: 'rgba(46, 125, 50, 0.8)',
                            '&:hover': {
                              backgroundColor: 'rgba(46, 125, 50, 1)',
                            },
                          }}>
                          <WallpaperIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title='Open full size'>
                      <IconButton
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(image.url, '_blank');
                        }}
                        sx={{
                          color: 'white',
                          backgroundColor: 'rgba(25, 118, 210, 0.8)',
                          '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 1)',
                          },
                        }}>
                        <OpenInNewIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Image Info */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      color: 'white',
                      p: 0.5,
                    }}>
                    <Typography
                      variant='caption'
                      sx={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.65rem',
                      }}>
                      {image.width} × {image.height}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GoogleImagesGallery;
