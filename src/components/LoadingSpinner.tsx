import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
}) => {
  return (
    <Box
      display='flex'
      flexDirection='column'
      justifyContent='center'
      alignItems='center'
      minHeight='200px'
      gap={2}
    >
      <CircularProgress size={60} />
      <Typography 
        variant='h6' 
        align='center'
        sx={{ 
          maxWidth: '400px',
          px: 2 
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
