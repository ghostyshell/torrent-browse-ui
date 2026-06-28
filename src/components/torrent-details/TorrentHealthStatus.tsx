import React from 'react';
import { Paper, Typography, Stack, Box, Chip } from '@mui/material';
import {
  Thermostat as ThermostatIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Circle as CircleIcon,
  RocketLaunch as RocketLaunchIcon,
  Bolt as BoltIcon,
  HourglassEmpty as HourglassEmptyIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { Torrent } from '../../types/Torrent';
import {
  getSeeders,
  getLeechers,
  getHealthColor,
} from '../../utils/torrentDetailsUtils';

interface TorrentHealthStatusProps {
  torrent: Torrent;
}

const TorrentHealthStatus: React.FC<TorrentHealthStatusProps> = ({
  torrent,
}) => {
  const seeders = getSeeders(torrent.Seeders);
  const leechers = getLeechers(torrent.Leechers);
  const healthColor = getHealthColor(seeders, leechers);

  const statusLabel =
    healthColor === 'success'
      ? 'Excellent'
      : healthColor === 'warning'
      ? 'Good'
      : 'Poor';
  const statusColor =
    healthColor === 'success'
      ? 'success.main'
      : healthColor === 'warning'
      ? 'warning.main'
      : 'error.main';

  const speed = (() => {
    if (seeders > 50) return { label: 'Very Fast', icon: <RocketLaunchIcon sx={{ fontSize: 18 }} /> };
    if (seeders > 10) return { label: 'Fast', icon: <BoltIcon sx={{ fontSize: 18 }} /> };
    if (seeders > 2) return { label: 'Moderate', icon: <HourglassEmptyIcon sx={{ fontSize: 18 }} /> };
    return { label: 'Slow', icon: <TrendingDownIcon sx={{ fontSize: 18 }} /> };
  })();

  return (
    <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ThermostatIcon color='primary' />
        <Typography variant='h6' color='primary'>
          Health Status
        </Typography>
      </Box>

      <Stack spacing={2}>
        <Box>
          <Typography variant='body2' color='text.secondary' gutterBottom>
            Peer Activity
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip
              icon={<UploadIcon sx={{ fontSize: '1rem' }} />}
              label={`${seeders} Seeders`}
              color={healthColor}
              size='medium'
            />
            <Chip
              icon={<DownloadIcon sx={{ fontSize: '1rem' }} />}
              label={`${leechers} Leechers`}
              variant='outlined'
              size='medium'
            />
          </Box>
        </Box>

        <Box>
          <Typography variant='body2' color='text.secondary'>
            Health Ratio: {seeders}:{leechers}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircleIcon sx={{ fontSize: 14, color: statusColor }} />
            <Typography variant='body2' sx={{ color: statusColor }} fontWeight='bold'>
              {statusLabel}
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant='body2' color='text.secondary'>
            Download Speed Estimate
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {speed.icon}
            <Typography variant='body2'>{speed.label}</Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
};

export default TorrentHealthStatus;