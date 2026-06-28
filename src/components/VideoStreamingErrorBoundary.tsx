import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class VideoStreamingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Video streaming error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{ p: 3 }}>
          <Alert severity='error' sx={{ mb: 2 }}>
            <Typography variant='h6' gutterBottom>
              Video Streaming Error
            </Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              Something went wrong with the video streaming feature. This might
              be due to:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Invalid or missing Real-Debrid API key</li>
              <li>Network connectivity issues</li>
              <li>Torrent not available on Real-Debrid servers</li>
              <li>No video files found in the torrent</li>
            </ul>
          </Alert>
          <Button
            variant='outlined'
            onClick={() => this.setState({ hasError: false, error: undefined })}
            sx={{ mr: 2 }}>
            Try Again
          </Button>
          {this.state.error && (
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ display: 'block', mt: 2 }}>
              Error details: {this.state.error.message}
            </Typography>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default VideoStreamingErrorBoundary;
