import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  CloudSync as CloudSyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Favorite as FavoriteIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { universalSyncUtility } from '../utils/universalSyncUtility';

interface UniversalSyncButtonProps {
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
}

const UniversalSyncButton: React.FC<UniversalSyncButtonProps> = ({
  variant = 'button',
  size = 'medium',
}) => {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const result = await universalSyncUtility.syncAllDataToBackend();
      setSyncResult(result);

      // Store last sync time
      localStorage.setItem(
        'last_universal_sync_time',
        new Date().toISOString()
      );
    } catch (error) {
      setSyncResult({
        overall: { success: false, totalSynced: 0, totalErrors: 1 },
        favorites: { success: false, syncedItems: 0, errors: ['Sync failed'] },
        cachedLinks: {
          success: false,
          syncedItems: 0,
          errors: ['Sync failed'],
        },
        coverImages: {
          success: false,
          syncedItems: 0,
          errors: ['Sync failed'],
        },
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSyncResult(null);
  };

  const isUniversalSyncActive = universalSyncUtility.isUniversalSyncActive();

  const buttonContent =
    variant === 'icon' ? (
      <CloudSyncIcon />
    ) : (
      <>
        <CloudSyncIcon sx={{ mr: 1 }} />
        Sync to Backend
      </>
    );

  return (
    <>
      <Button
        variant='outlined'
        color='primary'
        size={size}
        onClick={() => setOpen(true)}
        startIcon={variant === 'button' ? <CloudSyncIcon /> : undefined}
        disabled={isUniversalSyncActive}
        sx={{
          ...(variant === 'icon' && {
            minWidth: 'auto',
            width: 40,
            height: 40,
            borderRadius: '50%',
          }),
        }}>
        {variant === 'icon' ? <CloudSyncIcon /> : 'Sync to Backend'}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudSyncIcon />
          Universal Data Sync
        </DialogTitle>

        <DialogContent>
          {isUniversalSyncActive ? (
            <Alert severity='info' sx={{ mb: 2 }}>
              Universal sync is already active. Your data is automatically
              synced across all sessions.
            </Alert>
          ) : (
            <Box>
              <Typography variant='body1' gutterBottom>
                Sync your local data to the backend to make it available across
                all browser sessions and devices.
              </Typography>

              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                This will upload your favorites, cached links, and cover images
                to the backend storage.
              </Typography>

              {!syncing && !syncResult && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Button
                    variant='contained'
                    color='primary'
                    size='large'
                    onClick={handleSync}
                    startIcon={<CloudSyncIcon />}>
                    Start Sync
                  </Button>
                </Box>
              )}

              {syncing && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant='body2'>
                    Syncing your data to backend...
                  </Typography>
                </Box>
              )}

              {syncResult && (
                <Box sx={{ mt: 2 }}>
                  <Alert
                    severity={
                      syncResult.overall.success ? 'success' : 'warning'
                    }
                    sx={{ mb: 2 }}>
                    <Typography variant='body2'>
                      Sync completed: {syncResult.overall.totalSynced} items
                      synced
                      {syncResult.overall.totalErrors > 0 &&
                        `, ${syncResult.overall.totalErrors} errors`}
                    </Typography>
                  </Alert>

                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <FavoriteIcon
                          color={
                            syncResult.favorites.success ? 'success' : 'error'
                          }
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary='Favorites'
                        secondary={`${syncResult.favorites.syncedItems} synced, ${syncResult.favorites.errors.length} errors`}
                      />
                      <Chip
                        label={
                          syncResult.favorites.success ? 'Success' : 'Partial'
                        }
                        color={
                          syncResult.favorites.success ? 'success' : 'warning'
                        }
                        size='small'
                      />
                    </ListItem>

                    <ListItem>
                      <ListItemIcon>
                        <LinkIcon
                          color={
                            syncResult.cachedLinks.success ? 'success' : 'error'
                          }
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary='Cached Links'
                        secondary={`${syncResult.cachedLinks.syncedItems} synced, ${syncResult.cachedLinks.errors.length} errors`}
                      />
                      <Chip
                        label={
                          syncResult.cachedLinks.success ? 'Success' : 'Partial'
                        }
                        color={
                          syncResult.cachedLinks.success ? 'success' : 'warning'
                        }
                        size='small'
                      />
                    </ListItem>

                    {syncResult.coverImages && (
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircleIcon
                            color={
                              syncResult.coverImages.success
                                ? 'success'
                                : 'error'
                            }
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary='Cover Images'
                          secondary={`${syncResult.coverImages.syncedItems} synced, ${syncResult.coverImages.errors.length} errors`}
                        />
                        <Chip
                          label={
                            syncResult.coverImages.success
                              ? 'Success'
                              : 'Partial'
                          }
                          color={
                            syncResult.coverImages.success
                              ? 'success'
                              : 'warning'
                          }
                          size='small'
                        />
                      </ListItem>
                    )}
                  </List>

                  {syncResult.overall.success &&
                    syncResult.overall.totalSynced > 0 && (
                      <Alert severity='success' sx={{ mt: 2 }}>
                        Universal sync enabled! Your data is now available
                        across all browser sessions.
                      </Alert>
                    )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            {syncResult ? 'Close' : 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UniversalSyncButton;
