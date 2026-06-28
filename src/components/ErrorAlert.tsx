import React from 'react';
import { Paper, Typography } from '@mui/material';

interface ErrorAlertProps {
  error: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error }) => {
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3, backgroundColor: 'error.dark' }}>
      <Typography color='error'>{error}</Typography>
    </Paper>
  );
};

export default ErrorAlert;
