import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Button,
} from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon, CastConnected as CastConnectedIcon } from '@mui/icons-material';
import HTML5Player from './HTML5Player';
import CastButton from './CastButton';
import { useGoogleCast } from '../hooks/useGoogleCast';
import { supportsRangeRequests as checkRangeSupport } from '../utils/videoStreamUtils';

interface VideoPlayerModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  filename: string;
  loading?: boolean;
  error?: string | null;
  supportsRangeRequests?: boolean;
  onRetryWithRegeneration?: () => Promise<void>; // Callback to regenerate stream link
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  open,
  onClose,
  videoUrl,
  filename,
  loading = false,
  error = null,
  supportsRangeRequests = false,
  onRetryWithRegeneration,
}) => {
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const {
    available: castAvailable,
    isCastingThis,
    castState,
    deviceName,
    error: castError,
    toggleCast,
    stopCasting,
  } = useGoogleCast({ videoUrl, filename });
  // Cap silent auto-regen at one attempt per modal open so a genuinely dead
  // magnet can't loop us forever — if regen produces another bad URL, fall
  // through to the manual "Regenerate Link" popup.
  const autoRegenCountRef = useRef<number>(0);

  const handlePlayerReady = useCallback(
    (videoElement: HTMLVideoElement) => {
      videoElementRef.current = videoElement;
      setPlayerError(null);
      setNetworkError(false);

      // For streams that don't support range requests, disable some seeking features
      if (!supportsRangeRequests && !checkRangeSupport(videoUrl)) {
        // Limited seeking capabilities
      }
    },
    [videoUrl, supportsRangeRequests]
  );

  const handlePlayerError = useCallback(
    async (mediaError: MediaError | null, _videoElement: HTMLVideoElement) => {
      console.error('Video player error received:', mediaError);

      if (mediaError) {
        // MEDIA_ERR_NETWORK (2) or MEDIA_ERR_SRC_NOT_SUPPORTED (4): HTML5Player has
        // already retried internally. Do not HEAD-fetch with no-cors — opaque responses
        // look "successful" for almost any cross-origin URL, which caused load() retry
        // loops and endless "Checking stream availability...".
        if (mediaError.code === 2 || mediaError.code === 4) {
          // Silent self-heal: if a regeneration callback is wired up and we haven't
          // already auto-regenerated for this URL, regenerate once before bothering
          // the user. Most "recently cached" failures are stale RD tokens that a
          // fresh /unrestrict call resolves transparently.
          if (
            onRetryWithRegeneration &&
            videoUrl &&
            autoRegenCountRef.current < 1
          ) {
            autoRegenCountRef.current += 1;
            try {
              await onRetryWithRegeneration();
              return;
            } catch (regenErr) {
              console.error('Silent regenerate failed:', regenErr);
            }
          }

          setNetworkError(true);
          setPlayerError(
            'Stream link is unavailable or expired. Click "Regenerate Link" to get a fresh stream URL.'
          );
          return;
        }
        setPlayerError(
          'Failed to load video. The stream may not be compatible.'
        );
      } else {
        setPlayerError(
          'Failed to load video. The stream may not be compatible.'
        );
      }
    },
    [onRetryWithRegeneration, videoUrl]
  );

  // Handle regeneration of stream link
  const handleRegenerateLink = useCallback(async () => {
    if (!onRetryWithRegeneration) {
      console.warn('No regeneration callback provided');
      return;
    }

    // Clear error states - the parent hook will handle loading state
    setPlayerError(null);
    setNetworkError(false);

    try {
      await onRetryWithRegeneration();

    } catch (error) {
      console.error('❌ Failed to regenerate stream link:', error);
      setPlayerError(
        error instanceof Error
          ? error.message
          : 'Failed to regenerate stream link'
      );
      setNetworkError(true);
    }
  }, [onRetryWithRegeneration]);

  // While a Cast device is playing this video, silence the local player so we
  // don't get doubled audio coming from both the laptop and the TV.
  useEffect(() => {
    if (isCastingThis && videoElementRef.current) {
      videoElementRef.current.pause();
    }
  }, [isCastingThis]);

  // Clean up when modal closes
  useEffect(() => {
    if (!open) {
      setPlayerError(null);
      setNetworkError(false);
      autoRegenCountRef.current = 0;
      if (videoElementRef.current) {
        videoElementRef.current.pause();
      }
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth={true}
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          color: 'white',
          height: 'auto',
          maxHeight: '90vh',
          margin: { xs: '8px', sm: '16px', md: '32px' },
          padding: 0,
          overflow: 'hidden',
          borderRadius: 2,
        },
      }}>
      <DialogContent
        sx={{
          p: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {/* Cast Button (shown whenever the Cast SDK is available in this browser) */}
        {!loading && !error && videoUrl && (
          <CastButton
            available={castAvailable}
            isCastingThis={isCastingThis}
            castState={castState}
            onClick={toggleCast}
            sx={{
              position: 'absolute',
              top: 8,
              right: 56,
              zIndex: 1000,
            }}
          />
        )}

        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.7)',
            },
          }}>
          <CloseIcon />
        </IconButton>

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
              gap: 2,
            }}>
            <CircularProgress size={60} sx={{ color: 'white' }} />
            <Typography variant='h6' color='white'>
              Preparing video stream...
            </Typography>
            <Typography variant='body2' color='white' sx={{ opacity: 0.7 }}>
              This may take a few moments
            </Typography>
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
              gap: 2,
            }}>
            <Typography variant='h6' color='error'>
              Stream Error
            </Typography>
            <Typography variant='body1' color='white' sx={{ textAlign: 'center', maxWidth: '80%' }}>
              {error}
            </Typography>
            <Button variant='contained' color='primary' onClick={onClose}>
              Close
            </Button>
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            {videoUrl ? (
              <Box
                sx={{
                  width: '100%',
                  /* Narrow screens: hug video aspect ratio (avoid tall empty letterbox). */
                  height: { xs: 'auto', sm: 'min(85vh, 100dvh - 64px)' },
                  minHeight: { xs: 0, sm: '40vh' },
                  maxHeight: '85vh',
                  backgroundColor: 'black',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'stretch' },
                }}>
                <HTML5Player
                  key={videoUrl} // Force new instance only when URL actually changes
                  onReady={handlePlayerReady}
                  onError={handlePlayerError}
                  src={videoUrl}
                  type='video/mp4'
                  autoplay={true}
                  controls={true}
                  hideControlsDelay={3000}
                  className='video-player-fullscreen'
                />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 400,
                  bgcolor: 'rgba(0,0,0,0.5)',
                }}>
                <Typography variant='h6' color='white'>
                  No video source available
                </Typography>
              </Box>
            )}

            {/* Casting Overlay — covers the (paused) local player while a TV plays */}
            {isCastingThis && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.85)',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  zIndex: 998,
                  borderRadius: '8px',
                  textAlign: 'center',
                  px: 3,
                }}>
                <CastConnectedIcon sx={{ fontSize: 64, color: 'primary.light' }} />
                <Typography variant='h6'>
                  {deviceName ? `Casting to ${deviceName}` : 'Casting to TV'}
                </Typography>
                <Typography variant='body2' sx={{ opacity: 0.7, maxWidth: 360 }}>
                  {filename}
                </Typography>
                <Button
                  variant='contained'
                  color='primary'
                  startIcon={<CastConnectedIcon />}
                  onClick={stopCasting}>
                  Stop Casting
                </Button>
              </Box>
            )}

            {/* Cast Error */}
            {castError && !isCastingThis && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: 'rgba(211, 47, 47, 0.92)',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  fontSize: '0.8rem',
                  zIndex: 999,
                }}>
                {castError}
              </Box>
            )}

            {/* Player Error Display */}
            {playerError && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  bgcolor: 'rgba(0,0,0,0.9)',
                  color: 'white',
                  p: 3,
                  borderRadius: 2,
                  maxWidth: '80%',
                  textAlign: 'center',
                  zIndex: 999,
                  border: networkError ? '2px solid #ff9800' : 'none',
                }}>
                <Typography variant='body1' sx={{ mb: 2 }}>
                  {playerError}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  {networkError && onRetryWithRegeneration && (
                    <Button
                      onClick={handleRegenerateLink}
                      variant='contained'
                      color='warning'
                      startIcon={<RefreshIcon />}
                      disabled={loading}
                      size='small'>
                      {loading ? 'Regenerating...' : 'Regenerate Link'}
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setPlayerError(null);
                      setNetworkError(false);
                    }}
                    sx={{ color: 'white' }}
                    size='small'>
                    Dismiss
                  </Button>
                </Box>
              </Box>
            )}

            {/* Stream Info */}
            {!supportsRangeRequests && !checkRangeSupport(videoUrl) && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 80,
                  right: 8,
                  bgcolor: 'rgba(255, 152, 0, 0.8)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  zIndex: 999,
                }}>
                Stream mode - limited seeking
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { VideoPlayerModal };
export default React.memo(VideoPlayerModal);
