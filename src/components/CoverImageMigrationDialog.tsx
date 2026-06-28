import React, { useState } from 'react';
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
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { coverImageService } from '../services/enhancedCoverImageService';

interface CoverImageMigrationDialogProps {
  open: boolean;
  onClose: () => void;
  coverCount: number;
}

export const CoverImageMigrationDialog: React.FC<
  CoverImageMigrationDialogProps
> = ({ open, onClose, coverCount }) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTorrent, setCurrentTorrent] = useState('');
  const [results, setResults] = useState<{
    migrated: number;
    skipped: number;
    failed: number;
    total: number;
    errors: Array<{ torrent: string; error: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    setResults(null);
    setProgress(0);

    try {
      const migrationResults = await coverImageService.migrateLocalStorageToBackend(
        (current, total, torrentName) => {
          setProgress((current / total) * 100);
          setCurrentTorrent(torrentName);
        }
      );

      setResults(migrationResults);

      // If migration was successful, clear localStorage
      if (migrationResults.migrated > 0 && migrationResults.failed === 0) {
        coverImageService.clearLocalStorageCovers();
      }
    } catch (err: any) {
      setError(err.message || 'Migration failed');
    } finally {
      setIsMigrating(false);
      setProgress(100);
    }
  };

  const handleClose = () => {
    if (!isMigrating) {
      // Clear localStorage if migration was successful
      if (results && results.migrated > 0) {
        coverImageService.clearLocalStorageCovers();
      }
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUploadIcon />
          Migrate Cover Images to Backend
        </Box>
      </DialogTitle>

      <DialogContent>
        {!results && !error && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Found <strong>{coverCount}</strong> cover images in localStorage.
                Migrating them to the backend will make them available across all
                devices and sessions.
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This process will:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="✓ Upload all cover images to the backend"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="✓ Skip images already in the backend"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="✓ Clear localStorage after successful migration"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>
          </>
        )}

        {isMigrating && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Migrating: {currentTorrent}
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}>
              {Math.round(progress)}% complete
            </Typography>
          </Box>
        )}

        {results && !isMigrating && (
          <Box>
            <Alert
              severity={
                results.failed === 0
                  ? 'success'
                  : results.migrated > 0
                  ? 'warning'
                  : 'error'
              }
              sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Migration Complete
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${results.migrated} Migrated`}
                color="success"
                size="small"
              />
              <Chip
                icon={<InfoIcon />}
                label={`${results.skipped} Skipped`}
                color="default"
                size="small"
              />
              {results.failed > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${results.failed} Failed`}
                  color="error"
                  size="small"
                />
              )}
            </Box>

            {results.errors.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Errors:
                </Typography>
                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {results.errors.map((err, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={err.torrent}
                        secondary={err.error}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error">
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isMigrating}>
          {results ? 'Close' : 'Cancel'}
        </Button>
        {!results && !error && (
          <Button
            onClick={handleMigrate}
            variant="contained"
            disabled={isMigrating}
            startIcon={<CloudUploadIcon />}>
            {isMigrating ? 'Migrating...' : 'Start Migration'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CoverImageMigrationDialog;
