import React from 'react';
import {
  DialogTitle,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Category as CategoryIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Save as SaveIcon,
  CloudOff as CloudOffIcon,
} from '@mui/icons-material';
import { Torrent } from '../../types/Torrent';
import { torrentDetailsCache } from '../../utils/torrentDetailsCache';
import { coverImageService } from '../../services/enhancedCoverImageService';

interface TorrentModalHeaderProps {
  torrent: Torrent;
  onClose: () => void;
  onForceRefresh: () => void;
  onRemoveCover: () => void;
}

const TorrentModalHeader: React.FC<TorrentModalHeaderProps> = ({
  torrent,
  onClose,
  onForceRefresh,
  onRemoveCover,
}) => {
  return (
    <DialogTitle sx={{ pb: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
        <Typography variant='h5' component='div' sx={{ flexGrow: 1, pr: 2 }}>
          {torrent.Name || 'Untitled'}
        </Typography>
        <IconButton
          aria-label='close'
          onClick={onClose}
          sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Source and Category chips */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        {torrent.Source && (
          <Chip
            label={
              torrent.Source.charAt(0).toUpperCase() + torrent.Source.slice(1)
            }
            color='primary'
            size='small'
            icon={<InfoIcon />}
          />
        )}
        {torrent.Category && (
          <Chip
            label={torrent.Category}
            variant='outlined'
            size='small'
            icon={<CategoryIcon />}
          />
        )}

        {/* Cache indicator (development only) */}
        {process.env.NODE_ENV === 'development' &&
          torrent.Source &&
          torrent.Url && (
            <Chip
              label={
                torrentDetailsCache.get(torrent.Source, torrent.Url)
                  ? 'Cached'
                  : 'Fresh'
              }
              icon={
                torrentDetailsCache.get(torrent.Source, torrent.Url) ? (
                  <SaveIcon />
                ) : (
                  <CloudOffIcon />
                )
              }
              color={
                torrentDetailsCache.get(torrent.Source, torrent.Url)
                  ? 'success'
                  : 'default'
              }
              size='small'
              variant='outlined'
              onClick={() => {
                if (
                  torrent.Source &&
                  torrent.Url &&
                  torrentDetailsCache.get(torrent.Source, torrent.Url)
                ) {
                  onForceRefresh();
                }
              }}
              sx={{
                cursor:
                  torrent.Source &&
                  torrent.Url &&
                  torrentDetailsCache.get(torrent.Source, torrent.Url)
                    ? 'pointer'
                    : 'default',
              }}
            />
          )}

        {/* Cover image indicator and remove button */}
        {coverImageService.hasCoverImage(torrent) && (
          <Tooltip title='Remove custom cover image'>
            <Chip
              label='Custom Cover'
              icon={<ImageIcon />}
              color='secondary'
              size='small'
              variant='outlined'
              onDelete={onRemoveCover}
              deleteIcon={<DeleteIcon />}
              sx={{
                '& .MuiChip-deleteIcon': {
                  color: 'error.main',
                  '&:hover': {
                    color: 'error.dark',
                  },
                },
              }}
            />
          </Tooltip>
        )}
      </Box>
    </DialogTitle>
  );
};

export default TorrentModalHeader;
