import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { Torrent } from '../types/Torrent';

interface GoogleImagesSearchInputProps {
  torrent: Torrent;
}

const GoogleImagesSearchInput: React.FC<GoogleImagesSearchInputProps> = ({
  torrent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize search query with cleaned torrent name when component mounts
  useEffect(() => {
    if (torrent?.Name) {
      // Clean up the torrent name by removing common video-related terms
      const cleanedName = torrent.Name
        // Remove file extensions
        .replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm)$/i, '')
        // Remove quality indicators
        .replace(
          /\b(1080p|720p|480p|4k|hd|BluRay|BDRip|HDRip|WEBRip|DVDRip|CAMRip|TS|TC)\b/gi,
          ''
        )
        // Remove codec information
        .replace(/\b(x264|x265|HEVC|H\.264|H\.265|DivX|XviD)\b/gi, '')
        // Remove release group tags in brackets
        .replace(/\[[^\]]+\]/g, '')
        // Remove year in parentheses (optional, you might want to keep this)
        // .replace(/\(\d{4}\)/g, '')
        // Remove multiple spaces and trim
        .replace(/\s+/g, ' ')
        .trim();

      setSearchQuery(cleanedName);
    }
  }, [torrent]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    // Create Google Images search URL
    const encodedQuery = encodeURIComponent(searchQuery.trim());
    const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodedQuery}`;

    // Open in new tab
    window.open(googleImagesUrl, '_blank', 'noopener,noreferrer');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SearchIcon />
        <Typography variant='subtitle1' fontWeight='bold'>
          Search Google Images
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          variant='outlined'
          placeholder='Enter search terms for Google Images...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon color='action' />
              </InputAdornment>
            ),
          }}
          helperText='Search term is pre-filled with the torrent title. Edit as needed.'
        />
        <Button
          variant='contained'
          onClick={handleSearch}
          disabled={!searchQuery.trim()}
          startIcon={<OpenInNewIcon />}
          sx={{ minWidth: 120, height: 56 }} // Match the height of the TextField
        >
          Search
        </Button>
      </Box>
    </Paper>
  );
};

export default GoogleImagesSearchInput;
