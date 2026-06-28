import React from 'react';
import { Box, Typography } from '@mui/material';
import { SearchOff as SearchOffIcon } from '@mui/icons-material';

const NoResults: React.FC = () => {
  return (
    <Box
      role='status'
      sx={{
        mt: 6,
        mb: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 1,
        color: 'text.secondary',
      }}
    >
      <SearchOffIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1 }} />
      <Typography variant='h6' color='text.primary'>
        No torrents found
      </Typography>
      <Typography variant='body2' sx={{ maxWidth: 420 }}>
        Try a different search query, switch the source website, or relax the
        minimum seeders filter.
      </Typography>
    </Box>
  );
};

export default NoResults;