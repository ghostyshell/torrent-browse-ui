/**
 * Mobile-Optimized Torrent Results
 * Touch-friendly torrent display for Android WebView
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
} from '@mui/material';
import { Favorite, FavoriteBorder, Download, Info } from '@mui/icons-material';
import { Torrent } from '../types/Torrent';
import useMobileOptimizations from '../hooks/useMobileOptimizations';
import TorrentDetailsModal from './TorrentDetailsModal';
import '../styles/android.css';

interface MobileTorrentResultsProps {
  torrents: Torrent[];
  onTorrentSelect?: (torrent: Torrent) => void;
  onFavoriteToggle?: (torrent: Torrent) => void;
  favorites?: Set<string>;
  loading?: boolean;
}

const MobileTorrentResults: React.FC<MobileTorrentResultsProps> = ({
  torrents,
  onTorrentSelect,
  onFavoriteToggle,
  favorites = new Set(),
  loading = false,
}) => {
  const [selectedTorrent, setSelectedTorrent] = useState<Torrent | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const {
    isMobile,
    isAndroidWebView,
    touchOptimizations,
    getOptimalGridColumns,
    addTouchFeedback,
  } = useMobileOptimizations();

  // Calculate optimal grid columns based on viewport
  const gridColumns = getOptimalGridColumns(320);

  const handleTorrentClick = useCallback(
    (torrent: Torrent) => {
      setSelectedTorrent(torrent);
      setDetailsModalOpen(true);
      if (onTorrentSelect) {
        onTorrentSelect(torrent);
      }
    },
    [onTorrentSelect]
  );

  const handleFavoriteClick = useCallback(
    (event: React.MouseEvent, torrent: Torrent) => {
      event.stopPropagation();
      if (onFavoriteToggle) {
        onFavoriteToggle(torrent);
      }
    },
    [onFavoriteToggle]
  );

  const handleDownloadClick = useCallback(
    (event: React.MouseEvent, torrent: Torrent) => {
      event.stopPropagation();
      if (torrent.Magnet) {
        window.open(torrent.Magnet, '_blank');
      }
    },
    []
  );

  const formatFileSize = (size: string): string => {
    if (!size) return 'Unknown';
    // Handle various size formats
    const sizeStr = size.toString().toUpperCase();
    if (sizeStr.includes('GB')) return sizeStr;
    if (sizeStr.includes('MB')) return sizeStr;
    if (sizeStr.includes('KB')) return sizeStr;
    return size;
  };

  const formatSeeders = (seeders: string | number): string => {
    if (!seeders) return '0';
    return seeders.toString();
  };

  const getHealthColor = (
    seeders: string | number
  ): 'success' | 'warning' | 'error' => {
    const seederCount = parseInt(seeders?.toString() || '0');
    if (seederCount >= 10) return 'success';
    if (seederCount >= 5) return 'warning';
    return 'error';
  };

  const getTorrentKey = (torrent: Torrent): string => {
    return `${torrent.Title}-${torrent.Size}-${torrent.Source}`;
  };

  if (loading) {
    return (
      <Box className='mobile-loading'>
        <div className='mobile-loading-spinner' />
        <Typography variant='body1'>Loading torrents...</Typography>
      </Box>
    );
  }

  if (torrents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant='h6' color='textSecondary'>
          No torrents found
        </Typography>
        <Typography variant='body2' color='textSecondary'>
          Try adjusting your search terms or filters
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        className={
          isAndroidWebView
            ? 'mobile-torrent-grid android-webview'
            : 'mobile-torrent-grid'
        }>
        <Grid container spacing={2}>
          {torrents.map((torrent, index) => {
            const torrentKey = getTorrentKey(torrent);
            const isFavorite = favorites.has(torrentKey);

            return (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                lg={3}
                key={`${torrentKey}-${index}`}>
                <Card
                  className={touchOptimizations ? 'mobile-torrent-card' : ''}
                  onClick={() => handleTorrentClick(torrent)}
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                    '&:hover': !touchOptimizations
                      ? {
                          transform: 'translateY(-2px)',
                          boxShadow: 4,
                        }
                      : {},
                    ...(touchOptimizations && {
                      '&:active': {
                        transform: 'scale(0.98)',
                      },
                    }),
                  }}>
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    {/* Title */}
                    <Typography
                      variant='h6'
                      component='h3'
                      sx={{
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: 600,
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.3,
                      }}>
                      {torrent.Title}
                    </Typography>

                    {/* Source and Size */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}>
                      <Chip
                        label={torrent.Source}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: '12px' }}
                      />
                      <Typography variant='body2' color='textSecondary'>
                        {formatFileSize(torrent.Size)}
                      </Typography>
                    </Box>

                    {/* Seeders and Leechers */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 2,
                      }}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={`↑ ${formatSeeders(torrent.Seeders)}`}
                          size='small'
                          color={getHealthColor(torrent.Seeders)}
                          sx={{ fontSize: '11px', minWidth: 'auto' }}
                        />
                        <Chip
                          label={`↓ ${formatSeeders(torrent.Leechers)}`}
                          size='small'
                          variant='outlined'
                          sx={{ fontSize: '11px', minWidth: 'auto' }}
                        />
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size='small'
                          onClick={(e) => handleFavoriteClick(e, torrent)}
                          className={touchOptimizations ? 'touch-button' : ''}
                          sx={{
                            color: isFavorite ? 'error.main' : 'text.secondary',
                            minWidth: touchOptimizations ? 44 : 'auto',
                            minHeight: touchOptimizations ? 44 : 'auto',
                          }}>
                          {isFavorite ? <Favorite /> : <FavoriteBorder />}
                        </IconButton>

                        {torrent.Magnet && (
                          <IconButton
                            size='small'
                            onClick={(e) => handleDownloadClick(e, torrent)}
                            className={touchOptimizations ? 'touch-button' : ''}
                            sx={{
                              color: 'primary.main',
                              minWidth: touchOptimizations ? 44 : 'auto',
                              minHeight: touchOptimizations ? 44 : 'auto',
                            }}>
                            <Download />
                          </IconButton>
                        )}
                      </Box>

                      <IconButton
                        size='small'
                        onClick={() => handleTorrentClick(torrent)}
                        className={touchOptimizations ? 'touch-button' : ''}
                        sx={{
                          color: 'info.main',
                          minWidth: touchOptimizations ? 44 : 'auto',
                          minHeight: touchOptimizations ? 44 : 'auto',
                        }}>
                        <Info />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Torrent Details Modal */}
      {selectedTorrent && (
        <TorrentDetailsModal
          open={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedTorrent(null);
          }}
          torrent={selectedTorrent}
        />
      )}
    </>
  );
};

export default MobileTorrentResults;
