import { Torrent } from '../types/Torrent';
import { coverImageService } from '../services/enhancedCoverImageService';

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
      height: 300,
      color: 'transparent', // Hide the icon when we have a cover image
      fontSize: '4rem',
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
    height: 300,
    color: 'white',
    fontSize: '4rem',
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
