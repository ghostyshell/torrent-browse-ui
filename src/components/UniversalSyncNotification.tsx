import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  IconButton,
  Collapse,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudSync as CloudSyncIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { storageConfig } from '../utils/storageConfig';

/**
 * UniversalSyncNotification Component
 *
 * Shows a notification when the app enables universal backend sync mode
 * to inform users that their data is now available across all browser sessions
 */
const UniversalSyncNotification: React.FC = () => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we're in backend-first mode for universal sync
    const config = storageConfig.getConfig();
    const isUniversalSync = config.useBackendFirst && !config.backendOnly;

    // Check if this was dismissed before
    const wasDismissed =
      localStorage.getItem('universal-sync-notification-dismissed') === 'true';

    if (isUniversalSync && !wasDismissed) {
      // Small delay to let the page load first and after backend detection
      const timer = setTimeout(() => {
        setShow(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    // Remember dismissal
    try {
      localStorage.setItem('universal-sync-notification-dismissed', 'true');
    } catch (error) {
      // localStorage might not be available
    }
  };

  if (dismissed || !show) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 1200,
        maxWidth: 400,
      }}>
      <Collapse in={show}>
        <Alert
          severity='success'
          variant='filled'
          icon={<CloudSyncIcon />}
          action={
            <IconButton
              aria-label='close'
              color='inherit'
              size='small'
              onClick={handleDismiss}>
              <CloseIcon fontSize='inherit' />
            </IconButton>
          }
          sx={{
            bgcolor: 'success.main',
            color: 'success.contrastText',
            boxShadow: 3,
          }}>
          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudSyncIcon fontSize='small' />
            Universal Data Sync Active
          </AlertTitle>

          <Typography variant='body2' sx={{ mb: 1 }}>
            Your synced data is now available across all browser sessions and
            devices. Favorites, cached links, and other data will persist
            everywhere you access this app.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size='small'
              icon={<ShareIcon />}
              label='Cross-Session Sync'
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
                fontSize: '0.75rem',
              }}
            />
            <Chip
              size='small'
              label='Backend Priority'
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
                fontSize: '0.75rem',
              }}
            />
          </Box>
        </Alert>
      </Collapse>
    </Box>
  );
};

export default UniversalSyncNotification;
