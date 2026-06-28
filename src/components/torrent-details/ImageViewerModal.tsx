import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Wallpaper as WallpaperIcon,
} from '@mui/icons-material';
import { getFullResolutionUrl } from '../../utils/torrentDetailsUtils';

interface ImageViewerModalProps {
  images: { originalUrl: string; directUrl: string }[];
  open: boolean;
  selectedIndex: number;
  onClose: () => void;
  onSetAsCover: (imageUrl: string, originalUrl: string) => void;
  onImageChange: (index: number) => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  images,
  open,
  selectedIndex,
  onClose,
  onSetAsCover,
  onImageChange,
}) => {
  const [imageLoading, setImageLoading] = useState(true);

  // Reset loading state when modal opens or image changes
  useEffect(() => {
    if (open) {
      setImageLoading(true);

    }
  }, [open, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open || !images) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          onImageChange(
            selectedIndex === 0 ? images.length - 1 : selectedIndex - 1
          );
          break;
        case 'ArrowRight':
          event.preventDefault();
          onImageChange(
            selectedIndex === images.length - 1 ? 0 : selectedIndex + 1
          );
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, images, selectedIndex, onImageChange, onClose]);

  if (!images || !open) return null;

  const currentImage = images[selectedIndex];
  const fullResUrl = getFullResolutionUrl(currentImage.directUrl);

  const handlePrevImage = () => {
    setImageLoading(true);
    onImageChange(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
  };

  const handleNextImage = () => {
    setImageLoading(true);
    onImageChange(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== currentImage.directUrl) {
      target.src = currentImage.directUrl;
    } else if (target.src !== currentImage.originalUrl) {
      target.src = currentImage.originalUrl;
    }
    setImageLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0, 0, 0, 0.9)',
          backgroundImage: 'none',
        },
      }}>
      <DialogContent sx={{ p: 0, position: 'relative', minHeight: '500px' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2,
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.7)',
            },
          }}>
          <CloseIcon />
        </IconButton>

        {/* Set as Cover Button */}
        <Tooltip title='Set as cover image for this torrent'>
          <IconButton
            onClick={() => onSetAsCover(fullResUrl, currentImage.originalUrl)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 60,
              color: 'white',
              bgcolor: 'rgba(46, 125, 50, 0.8)',
              zIndex: 2,
              '&:hover': {
                bgcolor: 'rgba(46, 125, 50, 1)',
              },
            }}>
            <WallpaperIcon />
          </IconButton>
        </Tooltip>

        {images.length > 1 && (
          <>
            <IconButton
              onClick={handlePrevImage}
              sx={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 2,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
              }}>
              <ExpandMoreIcon sx={{ transform: 'rotate(90deg)' }} />
            </IconButton>

            <IconButton
              onClick={handleNextImage}
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 2,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
              }}>
              <ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />
            </IconButton>
          </>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '500px',
            p: 2,
            position: 'relative',
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
            src={fullResUrl}
            alt={`Image ${selectedIndex + 1}`}
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
              opacity: imageLoading ? 0 : 1,
              transition: 'opacity 0.3s ease',
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </Box>

        {images.length > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              px: 2,
              py: 1,
              borderRadius: 1,
            }}>
            <Typography variant='body2'>
              {selectedIndex + 1} of {images.length}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewerModal;
