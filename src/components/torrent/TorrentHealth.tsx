import React from 'react';
import { Box, Chip } from '@mui/material';
import { Upload as UploadIcon, Download as DownloadIcon } from '@mui/icons-material';

interface TorrentHealthProps {
  seeders: string;
  leechers: string;
}

const TorrentHealth: React.FC<TorrentHealthProps> = ({ seeders, leechers }) => {
  const getSeeders = (seeders: string) => {
    const num = parseInt(seeders) || 0;
    return num;
  };

  const getLeechers = (leechers: string) => {
    const num = parseInt(leechers) || 0;
    return num;
  };

  const getHealthColor = (seeders: number, leechers: number) => {
    const ratio = seeders / (leechers + 1);
    if (ratio > 2) return 'success';
    if (ratio > 1) return 'warning';
    return 'error';
  };

  const seederCount = getSeeders(seeders);
  const leecherCount = getLeechers(leechers);
  const healthColor = getHealthColor(seederCount, leecherCount);

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Chip
        icon={<UploadIcon sx={{ fontSize: '0.9rem' }} />}
        label={seederCount}
        color={healthColor}
        size='small'
        sx={{ fontSize: '0.6rem', height: 20 }}
      />
      <Chip
        icon={<DownloadIcon sx={{ fontSize: '0.9rem' }} />}
        label={leecherCount}
        variant='outlined'
        size='small'
        sx={{ fontSize: '0.6rem', height: 20 }}
      />
    </Box>
  );
};

export default TorrentHealth;