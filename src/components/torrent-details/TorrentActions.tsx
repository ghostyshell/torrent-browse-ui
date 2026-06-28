import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  PlayArrow as PlayIcon,
  ClearAll as ClearCacheIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { Torrent } from '../../types/Torrent';
import { realDebridService } from '../../services/realDebridService';
import { favoritesService } from '../../services/favoritesService';

interface TorrentActionsProps {
  torrent: Torrent;
  onMagnetClick: () => void;
  onUrlClick: () => void;
  onPlayClick?: () => void;
  isVideoCategory?: boolean;
  isStreamLoading?: boolean;
  onCacheClear?: () => void;
}

const TorrentActions: React.FC<TorrentActionsProps> = ({
  torrent,
  onMagnetClick,
  onUrlClick,
  onPlayClick,
  isVideoCategory = false,
  isStreamLoading = false,
  onCacheClear,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>(
    'success'
  );

  // Check if this torrent has a cached stream URL
  const hasCachedStreamUrl =
    torrent.Magnet && realDebridService.hasCachedStreamUrl(torrent.Magnet);

  // Check favorite status on component mount and when torrent changes
  useEffect(() => {
    if ('dateAdded' in torrent) {
      setIsFavorite(true);
    } else {
      setIsFavorite(favoritesService.isFavoriteSync(torrent));
    }
  }, [torrent]);

  const handleToggleFavorite = () => {
    if (isFavorite) {
      favoritesService.removeFromFavoritesSync(torrent);
      setSnackbarMessage('Removed from favorites');
    } else {
      favoritesService.addToFavoritesSync(torrent);
      setSnackbarMessage('Added to favorites');
    }

    setIsFavorite(!isFavorite);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  // Debug logging

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon color='primary' />
          <Typography variant='h6' color='primary'>
            Links &amp; Actions
          </Typography>
        </Box>

        {/* Cached Stream URL Indicator */}
        {hasCachedStreamUrl && (
          <Chip
            label='Stream URL Cached'
            color='success'
            size='small'
            sx={{
              fontSize: '0.7rem',
              height: 'auto',
              '& .MuiChip-label': {
                py: 0.3,
              },
            }}
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Favorites Button */}
        <Button
          variant={isFavorite ? 'contained' : 'outlined'}
          startIcon={isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          onClick={handleToggleFavorite}
          color={isFavorite ? 'secondary' : 'primary'}
          sx={{
            minWidth: '140px',
          }}>
{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </Button>

        {isVideoCategory && torrent.Magnet && onPlayClick && (
          <Button
            variant='contained'
            startIcon={
              isStreamLoading ? (
                <CircularProgress size={20} color='inherit' />
              ) : (
                <PlayIcon />
              )
            }
            onClick={onPlayClick}
            disabled={isStreamLoading}
            color='success'
            sx={{
              bgcolor: isStreamLoading ? 'action.disabled' : 'success.main',
              '&:hover': {
                bgcolor: isStreamLoading ? 'action.disabled' : 'success.dark',
              },
            }}>
            {isStreamLoading ? 'Preparing Stream...' : 'Play Video'}
          </Button>
        )}

        {torrent.Magnet && (
          <Button
            variant='contained'
            startIcon={<DownloadIcon />}
            onClick={onMagnetClick}
            color='primary'>
            Download via Magnet
          </Button>
        )}

        {torrent.Url && (
          <Button
            variant='outlined'
            startIcon={<OpenInNewIcon />}
            onClick={onUrlClick}
            color='secondary'>
            View on Source Site
          </Button>
        )}

        {/* Cache Clear Button */}
        {hasCachedStreamUrl && onCacheClear && (
          <Button
            variant='outlined'
            startIcon={<ClearCacheIcon />}
            onClick={onCacheClear}
            color='warning'
            size='small'
            sx={{
              fontSize: '0.8rem',
              minWidth: 'auto',
            }}>
            Clear Cache
          </Button>
        )}
      </Box>

      {torrent.Magnet && (
        <Box sx={{ mt: 2 }}>
          <Typography variant='body2' color='text.secondary' gutterBottom>
            Magnet Link:
          </Typography>
          <Typography
            variant='body2'
            sx={{
              wordBreak: 'break-all',
              backgroundColor: 'action.hover',
              p: 1,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}>
            {torrent.Magnet}
          </Typography>
        </Box>
      )}

      {/* Favorites Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default TorrentActions;
