import React, { useState, useEffect } from 'react';
import { Box, CardMedia, Typography, Chip } from '@mui/material';
import { Upload as UploadIcon, Download as DownloadIcon } from '@mui/icons-material';
import { Torrent } from '../../types/Torrent';
import {
  getCategoryIcon,
  getSeeders,
  getLeechers,
  getHealthColor,
} from '../../utils/torrentDetailsUtils';
import { coverImageService } from '../../services/enhancedCoverImageService';

interface TorrentPosterImageProps {
  torrent: Torrent;
}

const TorrentPosterImage: React.FC<TorrentPosterImageProps> = ({ torrent }) => {
  const [currentCoverImage, setCurrentCoverImage] = useState<string | null>(
    null
  );

  const seeders = getSeeders(torrent.Seeders);
  const leechers = getLeechers(torrent.Leechers);
  const healthColor = getHealthColor(seeders, leechers);

  // Load cover image from backend-first storage
  useEffect(() => {
    const loadCoverImage = async () => {
      // First try the torrent's built-in cover image from search results
      if (torrent.coverImage?.url) {
        setCurrentCoverImage(torrent.coverImage.url);
        return;
      }

      // Then check our backend-first cover image service
      const existingCover = await coverImageService.getCoverImageAsync(torrent);
      setCurrentCoverImage(existingCover);
    };
    loadCoverImage();

    // Set up periodic check for updated cover images from universal sync
    const COVER_IMAGE_SYNC_INTERVAL = 30000; // Check every 30 seconds
    const interval = setInterval(async () => {
      if (!torrent.coverImage?.url) {
        const existingCover = await coverImageService.getCoverImageAsync(
          torrent
        );
        if (existingCover !== currentCoverImage) {
          setCurrentCoverImage(existingCover);
        }
      }
    }, COVER_IMAGE_SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [torrent, currentCoverImage]);

  // Generate placeholder styles with cover image
  const getPlaceholderImageStyles = () => {
    if (currentCoverImage) {
      return {
        backgroundImage: `url(${currentCoverImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 400,
        color: 'transparent', // Hide the icon when we have a cover image
        fontSize: '5rem',
        position: 'relative' as const,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1,
        },
      };
    }

    // Default styling without cover image
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 400,
      backgroundColor: '#f5f5f5',
      fontSize: '5rem',
      color: '#ccc',
    };
  };

  return (
    <Box sx={{ position: 'relative', mb: 3 }}>
      <CardMedia sx={getPlaceholderImageStyles()}>
        {!currentCoverImage && getCategoryIcon(torrent.Category || '')}
      </CardMedia>

      {/* Overlay with basic info */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          color: 'white',
          p: 2,
        }}>
        <Typography variant='h6' sx={{ fontWeight: 'bold', mb: 1 }}>
          {torrent.Name || 'Untitled'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<UploadIcon sx={{ fontSize: '1rem', color: 'white' }} />}
            label={`${seeders} Seeders`}
            color={healthColor}
            size='small'
            sx={{
              color: 'white',
              '& .MuiChip-label': { color: 'white' },
            }}
          />
          <Chip
            icon={<DownloadIcon sx={{ fontSize: '1rem', color: 'white' }} />}
            label={`${leechers} Leechers`}
            variant='outlined'
            size='small'
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '& .MuiChip-label': { color: 'white' },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default TorrentPosterImage;
