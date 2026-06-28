import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CloudSync as CloudSyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface CoverImageSyncDialogProps {
  open: boolean;
  onClose: () => void;
  onStartSync?: () => void;
  isLoading: boolean;
  progress: {
    current: number;
    total: number;
    torrentName: string;
  } | null;
  result: {
    synced: number;
    failed: number;
    total: number;
  } | null;
  error: string | null;
  availableCoverImages: number;
}

const CoverImageSyncDialog: React.FC<CoverImageSyncDialogProps> = ({
  open,
  onClose,
  onStartSync,
  isLoading,
  progress,
  result,
  error,
  availableCoverImages,
}) => {
  const getDialogTitle = () => {
    if (error) return 'Sync Failed';
    if (result) return 'Sync Complete';
    if (isLoading) return 'Syncing Cover Images';
    return 'Sync Cover Images to Universal Storage';
  };

  const getProgressPercentage = () => {
    if (!progress || progress.total === 0) return 0;
    return (progress.current / progress.total) * 100;
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      disableEscapeKeyDown={isLoading}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {error ? (
            <ErrorIcon color='error' />
          ) : result ? (
            <CheckCircleIcon color='success' />
          ) : (
            <CloudSyncIcon color='primary' />
          )}
          {getDialogTitle()}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Error State */}
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Success State */}
        {result && !error && (
          <Box sx={{ mb: 2 }}>
            <Alert severity='success' sx={{ mb: 2 }}>
              Cover images have been synced to Turso backend!
            </Alert>
            <Typography variant='body2' color='text.secondary'>
              <strong>Successfully synced:</strong> {result.synced} cover images
            </Typography>
            {result.failed > 0 && (
              <Typography variant='body2' color='error'>
                <strong>Failed to sync:</strong> {result.failed} cover images
              </Typography>
            )}
            <Typography variant='body2' color='text.secondary'>
              <strong>Total processed:</strong> {result.total} favorites
            </Typography>
          </Box>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box>
            <Typography variant='body1' gutterBottom>
              Syncing cover images from local storage to Turso backend...
            </Typography>

            {progress && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    gutterBottom>
                    Processing: {progress.torrentName}
                  </Typography>
                  <LinearProgress
                    variant='determinate'
                    value={getProgressPercentage()}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mt: 1 }}>
                    {progress.current} of {progress.total} favorites processed
                  </Typography>
                </Box>
              </>
            )}

            {!progress && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        )}

        {/* Initial State */}
        {!isLoading && !result && !error && (
          <Box>
            <Typography variant='body1' gutterBottom>
              This will sync all cover images for your favorites from local
              storage to the universal Turso backend.
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
              This ensures your cover images are available across all devices
              and browser sessions.
            </Typography>
            {availableCoverImages > 0 && (
              <Alert severity='info' sx={{ mt: 2 }}>
                Found {availableCoverImages} cover images in local storage that
                can be synced.
              </Alert>
            )}
            {availableCoverImages === 0 && (
              <Alert severity='warning' sx={{ mt: 2 }}>
                No cover images found in local storage to sync.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!isLoading && !result && !error && availableCoverImages > 0 && (
          <Button
            onClick={onStartSync}
            variant='contained'
            color='primary'
            startIcon={<CloudSyncIcon />}>
            Start Sync
          </Button>
        )}
        <Button onClick={handleClose} disabled={isLoading} color='primary'>
          {result || error ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CoverImageSyncDialog;
