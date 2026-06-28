import React from 'react';
import { Paper, Typography, Stack, Box } from '@mui/material';
import {
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { Torrent } from '../../types/Torrent';
import { formatSize, formatDate } from '../../utils/torrentDetailsUtils';

interface TorrentBasicInfoProps {
  torrent: Torrent;
}

const TorrentBasicInfo: React.FC<TorrentBasicInfoProps> = ({ torrent }) => {
  return (
    <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AssignmentIcon color='primary' />
        <Typography variant='h6' color='primary'>
          Basic Information
        </Typography>
      </Box>

      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon color='action' />
          <Box>
            <Typography variant='body2' color='text.secondary'>
              Size
            </Typography>
            <Typography variant='body1' fontWeight='bold'>
              {formatSize(torrent.Size)}
            </Typography>
          </Box>
        </Box>

        {torrent.DateUploaded && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon color='action' />
            <Box>
              <Typography variant='body2' color='text.secondary'>
                Upload Date
              </Typography>
              <Typography variant='body1' fontWeight='bold'>
                {formatDate(torrent.DateUploaded)}
              </Typography>
            </Box>
          </Box>
        )}

        {torrent.UploadedBy && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color='action' />
            <Box>
              <Typography variant='body2' color='text.secondary'>
                Uploader
              </Typography>
              <Typography variant='body1' fontWeight='bold'>
                {torrent.UploadedBy}
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default TorrentBasicInfo;
