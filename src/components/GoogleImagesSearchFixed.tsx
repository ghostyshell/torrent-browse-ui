import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Image as ImageIcon,
  Wallpaper as WallpaperIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { googleImagesService } from '../services/googleImagesService';
import { coverImageService } from '../services/enhancedCoverImageService';
import { Torrent } from '../types/Torrent';
import GoogleImagesGallery from './GoogleImagesGallery';

interface GoogleImageResult {
  url: string;
  title: string;
  thumbnail: string;
  width: number;
  height: number;
  source: string;
}

interface GoogleImagesSearchProps {
  torrent: Torrent;
  onImageSelect?: (imageUrl: string, originalUrl: string) => void;
}

const GoogleImagesSearch: React.FC<GoogleImagesSearchProps> = ({
  torrent,
  onImageSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleImageResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [coverSetSnackbar, setCoverSetSnackbar] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Initialize search query with torrent name when component mounts
  useEffect(() => {
    if (torrent?.Name) {
      const cleanedName = torrent.Name.replace(
        /\.(mkv|mp4|avi|mov|wmv|flv|webm)$/i,
        ''
      )
        .replace(
          /\b(1080p|720p|480p|4k|hd|BluRay|BDRip|HDRip|WEBRip|DVDRip)\b/gi,
          ''
        )
        .replace(/\b(x264|x265|HEVC|H\.264|H\.265)\b/gi, '')
        .replace(/\[\w+\]/g, '')
        .replace(/\(\d{4}\)/g, '')
        .trim();

      setSearchQuery(cleanedName);

      // Generate search suggestions asynchronously
      googleImagesService
        .generateSearchSuggestions(torrent.Name)
        .then((searchSuggestions) => {
          setSuggestions(searchSuggestions.slice(0, 5));
        })
        .catch((error) => {
          console.error('Failed to generate search suggestions:', error);
          setSuggestions([]);
        });
    }
  }, [torrent]);

  const handleSearch = async (query?: string) => {
    const queryToSearch = query || searchQuery;
    if (!queryToSearch.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const results = await googleImagesService.searchImages(queryToSearch, 20);
      setSearchResults(results);

      if (results.length === 0) {
        setSearchError('No images found for this search query');
      }
    } catch (error) {
      console.error('Google Images search error:', error);
      setSearchError('Failed to search images. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSetAsCover = async (imageUrl: string, originalUrl: string) => {
    if (torrent) {
      try {
        await coverImageService.setCoverImage(torrent, imageUrl, originalUrl);
        setCoverSetSnackbar(true);

        if (onImageSelect) {
          onImageSelect(imageUrl, originalUrl);
        }
      } catch (error) {
        console.error('Error setting cover image:', error);
        setSearchError('Failed to set cover image');
      }
    }
  };

  const handleImageClick = (imageUrl: string, index: number) => {
    setSelectedImageIndex(index);
    setGalleryOpen(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SearchIcon />
        <Typography variant='subtitle1' fontWeight='bold'>
          Google Images Search
        </Typography>
      </Box>

      {/* Search Input */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          size='small'
          placeholder='Search for cover images...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSearching}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            ),
          }}
        />
        <Button
          variant='contained'
          onClick={() => handleSearch()}
          disabled={isSearching || !searchQuery.trim()}
          sx={{ minWidth: 100 }}>
          {isSearching ? <CircularProgress size={20} /> : 'Search'}
        </Button>
        <Button
          variant='outlined'
          onClick={() => {
            if (searchQuery.trim()) {
              const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
                searchQuery
              )}&tbm=isch`;
              window.open(googleSearchUrl, '_blank');
            }
          }}
          disabled={!searchQuery.trim()}
          startIcon={<OpenInNewIcon />}
          sx={{ minWidth: 120 }}>
          Google
        </Button>
      </Box>

      {/* Search Suggestions */}
      {suggestions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant='caption' color='text.secondary' sx={{ mr: 1 }}>
            Suggestions:
          </Typography>
          {suggestions.map((suggestion, index) => (
            <Chip
              key={index}
              label={suggestion}
              size='small'
              onClick={() => handleSuggestionClick(suggestion)}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Search Error */}
      {searchError && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {searchError}
        </Alert>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}>
            <Typography variant='body2' color='text.secondary'>
              Found {searchResults.length} images
            </Typography>
            <Button
              variant='outlined'
              size='small'
              onClick={() => setGalleryOpen(true)}
              startIcon={<OpenInNewIcon />}
              sx={{ minWidth: 'auto' }}>
              View All in Gallery
            </Button>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 1,
              maxHeight: '300px',
              overflow: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
            }}>
            {searchResults.map((image, index) => (
              <Paper
                key={index}
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
                  src={image.thumbnail}
                  alt={image.title}
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'cover',
                  }}
                  onClick={() => handleImageClick(image.url, index)}
                />

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
                  <Tooltip title='Set as cover image'>
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetAsCover(image.url, image.url);
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

                  <Tooltip title='Open full size'>
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(image.url, index);
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

      {/* No Results Message */}
      {!isSearching &&
        searchResults.length === 0 &&
        searchQuery &&
        !searchError && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant='body2'>
              Search for images to find cover art for this torrent
            </Typography>
          </Box>
        )}

      {/* Loading State */}
      {isSearching && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4,
            gap: 2,
          }}>
          <CircularProgress size={24} />
          <Typography variant='body2' color='text.secondary'>
            Searching images...
          </Typography>
        </Box>
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={coverSetSnackbar}
        autoHideDuration={3000}
        onClose={() => setCoverSetSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          onClose={() => setCoverSetSnackbar(false)}
          severity='success'
          sx={{ width: '100%' }}>
          Image set as cover successfully!
        </Alert>
      </Snackbar>

      {/* Gallery Modal */}
      <GoogleImagesGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={searchResults}
        initialIndex={selectedImageIndex}
        onSetAsCover={(imageUrl, originalUrl) => {
          handleSetAsCover(imageUrl, originalUrl);
          setGalleryOpen(false);
        }}
        searchQuery={searchQuery}
      />
    </Box>
  );
};

export default GoogleImagesSearch;
