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
  Security as SecurityIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { storageConfig } from '../utils/storageConfig';

/**
 * IncognitoModeNotification Component
 *
 * Shows a notification when the app detects incognito/private browsing mode
 * and automatically switches to backend-only storage mode
 */
const IncognitoModeNotification: React.FC = () => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we're in backend-only mode (likely due to incognito detection)
    const config = storageConfig.getConfig();
    const isBackendOnly = config.backendOnly;

    // Check if this was dismissed before (using sessionStorage which persists in incognito)
    const wasDismissed =
      sessionStorage.getItem('incognito-notification-dismissed') === 'true';

    if (isBackendOnly && !wasDismissed) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setShow(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    // Remember dismissal for this session
    try {
      sessionStorage.setItem('incognito-notification-dismissed', 'true');
    } catch (error) {
      // sessionStorage might not be available either
    }
  };

  if (dismissed || !show) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1300,
        maxWidth: 400,
      }}>
      <Collapse in={show}>
        <Alert
          severity='info'
          variant='filled'
          icon={<SecurityIcon />}
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
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: 3,
          }}>
          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon fontSize='small' />
            Private Browsing Detected
          </AlertTitle>

          <Typography variant='body2' sx={{ mb: 1 }}>
            We've detected you're using incognito/private mode. Your data will
            be stored on our secure backend for persistence across sessions.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size='small'
              icon={<CloudIcon />}
              label='Backend Storage Active'
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
                fontSize: '0.75rem',
              }}
            />
            <Chip
              size='small'
              label='Data Persisted'
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

export default IncognitoModeNotification;
