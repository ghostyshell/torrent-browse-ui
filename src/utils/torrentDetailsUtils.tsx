import React from 'react';
import {
  Movie as MovieIcon,
  Tv as TvIcon,
  Gamepad as GamepadIcon,
  LibraryMusic as MusicIcon,
  Description as DocumentIcon,
  Apps as SoftwareIcon,
} from '@mui/icons-material';
import { Torrent } from '../types/Torrent';
import { coverImageService } from '../services/enhancedCoverImageService';

export const getCategoryIcon = (category: string): React.JSX.Element => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('movie') || cat.includes('film')) return <MovieIcon />;
  if (cat.includes('tv') || cat.includes('series') || cat.includes('show'))
    return <TvIcon />;
  if (cat.includes('game') || cat.includes('gaming')) return <GamepadIcon />;
  if (cat.includes('music') || cat.includes('audio') || cat.includes('mp3'))
    return <MusicIcon />;
  if (
    cat.includes('software') ||
    cat.includes('app') ||
    cat.includes('program')
  )
    return <SoftwareIcon />;
  return <DocumentIcon />;
};

export const getPlaceholderImage = (torrent: Torrent) => {
  // Check if torrent has a custom cover image
  const coverImageUrl =
    torrent.coverImage || coverImageService.getCoverImage(torrent);

  if (coverImageUrl) {
    return {
      backgroundImage: `url(${coverImageUrl})`,
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
        background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7))',
        zIndex: 1,
      },
    };
  }

  // Fall back to gradient placeholder
  const name = torrent.Name?.toLowerCase() || '';

  // Generate a gradient based on the torrent name for uniqueness
  const hash = name.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const colors = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
    ['#ff9a9e', '#fecfef'],
    ['#ffecd2', '#fcb69f'],
  ];

  const colorPair = colors[Math.abs(hash) % colors.length];

  return {
    background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    color: 'white',
    fontSize: '5rem',
  };
};

export const formatSize = (size: string) => {
  if (!size) return 'Unknown';
  return size;
};

export const formatDate = (date: string) => {
  if (!date) return 'Unknown';
  return date;
};

export const getSeeders = (seeders: string) => {
  const num = parseInt(seeders) || 0;
  return num;
};

export const getLeechers = (leechers: string) => {
  const num = parseInt(leechers) || 0;
  return num;
};

export const getHealthColor = (seeders: number, leechers: number) => {
  const ratio = seeders / (leechers + 1);
  if (ratio > 2) return 'success';
  if (ratio > 1) return 'warning';
  return 'error';
};

// Helper function to get full resolution image URL
export const getFullResolutionUrl = (url: string) => {
  // Remove 'md' from the filename to get full resolution
  // Example: image_md.jpg -> image.jpg, image_md.png -> image.png, etc.
  return url.replace(/\.md\.(jpg|jpeg|png|gif|webp)$/i, '.$1');
};
