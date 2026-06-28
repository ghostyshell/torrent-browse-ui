import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Link as LinkIcon,
  Wallpaper as WallpaperIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { coverImageService } from '../services/enhancedCoverImageService';
import { Torrent } from '../types/Torrent';

interface ManualImageData {
  originalUrl: string;
  directUrl: string;
  timestamp: number;
  id: string;
}

interface ManualImageInputProps {
  torrent: Torrent;
  onImageAdded?: (imageUrl: string, originalUrl: string) => void;
  onImagesChanged?: (images: ManualImageData[]) => void;
}

const ManualImageInput: React.FC<ManualImageInputProps> = ({
  torrent,
  onImageAdded,
  onImagesChanged,
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successSnackbar, setSuccessSnackbar] = useState(false);
  const [manualImages, setManualImages] = useState<ManualImageData[]>([]);

  const getStorageKey = useCallback(() => {
    return `manual-images-${torrent.Name}_${torrent.Source}_${torrent.Size}`
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
  }, [torrent.Name, torrent.Source, torrent.Size]);

  const loadManualImages = useCallback(() => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const images = JSON.parse(stored);
        setManualImages(images);
        if (onImagesChanged) {
          onImagesChanged(images);
        }
      }
    } catch (error) {
      console.error('Error loading manual images:', error);
    }
  }, [getStorageKey, onImagesChanged]);

  // Load existing manual images for this torrent from localStorage
  React.useEffect(() => {
    loadManualImages();
  }, [loadManualImages]);

  const saveManualImages = (images: ManualImageData[]) => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(images));
      setManualImages(images);
      if (onImagesChanged) {
        onImagesChanged(images);
      }
    } catch (error) {
      console.error('Error saving manual images:', error);
    }
  };

  const validateImageUrl = (url: string): boolean => {
    // Basic URL validation
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const checkImageExists = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;

      // Timeout after 10 seconds
      setTimeout(() => resolve(false), 10000);
    });
  };

  const handleAddImage = async () => {
    const trimmedUrl = imageUrl.trim();

    if (!trimmedUrl) {
      setValidationError('Please enter an image URL');
      return;
    }

    if (!validateImageUrl(trimmedUrl)) {
      setValidationError('Please enter a valid URL');
      return;
    }

    // Check if image already exists
    const exists = manualImages.some((img) => img.originalUrl === trimmedUrl);
    if (exists) {
      setValidationError('This image URL has already been added');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const imageExists = await checkImageExists(trimmedUrl);

      if (!imageExists) {
        setValidationError(
          'Unable to load image from this URL. Please check the URL and try again.'
        );
        setIsValidating(false);
        return;
      }

      // Add image to manual images list
      const newImage: ManualImageData = {
        originalUrl: trimmedUrl,
        directUrl: trimmedUrl,
        timestamp: Date.now(),
        id: `manual-${Date.now()}`,
      };

      const updatedImages = [...manualImages, newImage];
      saveManualImages(updatedImages);

      // Call the callback
      if (onImageAdded) {
        onImageAdded(trimmedUrl, trimmedUrl);
      }

      // Clear the input
      setImageUrl('');
      setSuccessSnackbar(true);

    } catch (error) {
      console.error('Error validating image:', error);
      setValidationError('Error validating image URL. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveImage = (imageId: string) => {
    const updatedImages = manualImages.filter((img) => img.id !== imageId);
    saveManualImages(updatedImages);

  };

  const handleSetAsCover = async (imageUrl: string, originalUrl: string) => {
    try {
      await coverImageService.setCoverImage(torrent, imageUrl, originalUrl);
      setSuccessSnackbar(true);
    } catch (error) {
      console.error('Error setting cover image:', error);
      setValidationError('Failed to set cover image');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddImage();
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
        }}>
        <LinkIcon />
        <Typography variant='subtitle1' fontWeight='bold'>
          Add Custom Image
        </Typography>
      </Box>

      {/* Add Image Input */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            size='small'
            placeholder='Enter image URL (e.g., https://example.com/image.jpg)'
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setValidationError(null);
            }}
            onKeyPress={handleKeyPress}
            error={!!validationError}
            helperText={validationError}
            disabled={isValidating}
          />
          <Button
            variant='contained'
            onClick={handleAddImage}
            disabled={isValidating || !imageUrl.trim()}
            startIcon={
              isValidating ? <CircularProgress size={16} /> : <AddIcon />
            }
            sx={{ minWidth: 'auto', px: 2 }}>
            {isValidating ? 'Validating...' : 'Add'}
          </Button>
        </Box>

        <Typography variant='caption' color='text.secondary'>
          Add images by pasting direct image URLs. The image will be validated
          before adding.
        </Typography>
      </Box>

      {/* Manual Images Gallery */}
      {manualImages.length > 0 && (
        <Box>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
            Custom Images ({manualImages.length})
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 1,
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
            }}>
            {manualImages.map((image) => (
              <Paper
                key={image.id}
                elevation={2}
                sx={{
                  position: 'relative',
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: 4,
                    '& .image-overlay': {
                      opacity: 1,
                    },
                  },
                }}>
                <img
                  src={image.directUrl}
                  alt='Custom upload'
                  style={{
                    width: '100%',
                    height: '80px',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    // Hide broken images
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
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
                    gap: 0.5,
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                  }}>
                  {/* Set as Cover Button */}
                  <Tooltip title='Set as cover'>
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetAsCover(image.directUrl, image.originalUrl);
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

                  {/* Remove Button */}
                  <Tooltip title='Remove image'>
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(image.id);
                      }}
                      sx={{
                        color: 'white',
                        backgroundColor: 'rgba(211, 47, 47, 0.8)',
                        '&:hover': {
                          backgroundColor: 'rgba(211, 47, 47, 1)',
                        },
                      }}>
                      <DeleteIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={successSnackbar}
        autoHideDuration={3000}
        onClose={() => setSuccessSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          onClose={() => setSuccessSnackbar(false)}
          severity='success'
          sx={{ width: '100%' }}>
          Image added successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManualImageInput;
