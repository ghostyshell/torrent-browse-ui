import React, { useEffect, useRef, useState, useCallback } from 'react';
import './HTML5Player.css';
import { CircularProgress, Box } from '@mui/material';
import { requiresCorsHandling } from '../utils/videoStreamUtils';

export interface HTML5PlayerProps {
  onReady?: (videoElement: HTMLVideoElement) => void;
  onError?: (error: MediaError | null, videoElement: HTMLVideoElement) => void;
  className?: string;
  src: string;
  type?: string;
  autoplay?: boolean;
  controls?: boolean;
  hideControlsDelay?: number; // in milliseconds
  maxRetries?: number; // Number of automatic retries before reporting error
}

export const HTML5Player: React.FC<HTML5PlayerProps> = ({
  onReady,
  onError,
  className = '',
  src,
  type = 'video/mp4',
  autoplay = false,
  controls = true,
  hideControlsDelay = 1000,
  maxRetries = 3,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(controls);
  const [isPaused, setIsPaused] = useState(!autoplay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** Fullscreen only: object-fit cover so video touches screen edges (may crop). */
  const [fillViewport, setFillViewport] = useState(false);
  const [corsMode, setCorsMode] = useState<
    'anonymous' | 'use-credentials' | null
  >(null); // Start with null, will be set based on video source

  // Auto-hide controls functionality
  const startHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    if (!isPaused && controls) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, hideControlsDelay);
    }
  }, [isPaused, controls, hideControlsDelay]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    startHideTimer();
  }, [startHideTimer]);

  // Video event handlers setup (only run once)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      retryCountRef.current = 0; // Reset retry count on successful load
      onReady && onReady(video);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      setIsPaused(false);
      startHideTimer();
    };

    const handlePause = () => {
      setIsPaused(true);
      setShowControls(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      const error = target.error;

      console.error('Video error:', e);
      console.error('Video error details:', {
        code: error?.code,
        message: error?.message,
        src: target.src,
        networkState: target.networkState,
        readyState: target.readyState,
        crossOrigin: target.crossOrigin,
        requiresCors: requiresCorsHandling(src),
        currentCorsMode: corsMode,
        retryCount: retryCountRef.current,
      });

      // Common error codes:
      // 1 = MEDIA_ERR_ABORTED - playback aborted
      // 2 = MEDIA_ERR_NETWORK - network error
      // 3 = MEDIA_ERR_DECODE - decoding error
      // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED - source not supported

      // If it's a network error and we're using CORS, try without CORS
      if (
        error?.code === 2 && // MEDIA_ERR_NETWORK
        corsMode === 'anonymous'
      ) {

        setCorsMode(null);
        return; // Don't set loading to false, let the retry happen
      }

      // If it's a source not supported error and we're not using CORS, try with CORS
      if (
        error?.code === 4 && // MEDIA_ERR_SRC_NOT_SUPPORTED
        corsMode === null &&
        !requiresCorsHandling(src)
      ) {

        setCorsMode('anonymous');
        return; // Don't set loading to false, let the retry happen
      }

      // For network errors (code 2), auto-retry before giving up
      if (error?.code === 2 && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = retryCountRef.current * 2000; // 2s, 4s, 6s
        console.log(`🔄 Auto-retrying video load (attempt ${retryCountRef.current}/${maxRetries}) in ${delay}ms...`);
        setIsLoading(true);
        retryTimeoutRef.current = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.load();
          }
        }, delay);
        return;
      }

      setIsLoading(false);

      // Notify parent component about the error
      if (onError) {
        onError(error, target);
      }
    };

    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [onReady, onError, startHideTimer, corsMode, src, maxRetries]);

  // Handle source changes separately to avoid reinitializing event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set CORS mode based on video source
    const shouldUseCors = !requiresCorsHandling(src);

    setCorsMode(shouldUseCors ? 'anonymous' : null);

    // Only change src if it's actually different
    if (video.src !== src) {

      video.src = src;
    }
  }, [src, corsMode]);

  // Handle CORS mode changes (for retry mechanism)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (corsMode === null) {
      video.removeAttribute('crossOrigin');
    } else {
      video.crossOrigin = corsMode;
    }

    // Force reload with new CORS setting
    if (video.src === src) {

      video.load();
    }
  }, [corsMode, src]);

  // Mouse and touch event handlers for showing controls
  const handleMouseMove = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleMouseLeave = useCallback(() => {
    if (!isPaused) {
      startHideTimer();
    }
  }, [isPaused, startHideTimer]);

  // Control functions
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        video.play().catch((err) => {
          console.error('Error playing video:', err);
        });
      } else {
        video.pause();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, []);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;

      const newVolume = parseFloat(e.target.value);
      video.volume = newVolume;
      video.muted = newVolume === 0;
    },
    []
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  }, []);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const el = container as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };

    const isFs =
      document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

    if (!isFs) {
      const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
      if (req) {
        void req().catch((err: unknown) =>
          console.error('requestFullscreen failed:', err)
        );
      }
    } else {
      const exit =
        document.exitFullscreen?.bind(document) ??
        doc.webkitExitFullscreen?.bind(document);
      if (exit) {
        void exit().catch((err: unknown) =>
          console.error('exitFullscreen failed:', err)
        );
      }
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
    };

    const syncFullscreen = () => {
      const fs =
        document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      const on = !!fs;
      setIsFullscreen(on);
      if (!on) {
        setFillViewport(false);
      }
    };

    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          showControlsTemporarily();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(
            0,
            videoRef.current.currentTime - 10
          );
          showControlsTemporarily();
          break;
        case 'ArrowRight':
          e.preventDefault();
          videoRef.current.currentTime = Math.min(
            duration,
            videoRef.current.currentTime + 10
          );
          showControlsTemporarily();
          break;
        case 'ArrowUp':
          e.preventDefault();
          videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
          showControlsTemporarily();
          break;
        case 'ArrowDown':
          e.preventDefault();
          videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
          showControlsTemporarily();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          showControlsTemporarily();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    duration,
    showControlsTemporarily,
    togglePlayPause,
    toggleMute,
  ]);

  // Format time display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`html5-player-container ${className} ${
        isFullscreen ? 'fullscreen' : ''
      } ${fillViewport ? 'fill-viewport' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={showControlsTemporarily}>
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}>
          <CircularProgress />
        </Box>
      )}

      <video
        ref={videoRef}
        className='html5-video'
        autoPlay={autoplay}
        playsInline
        preload='metadata'
        crossOrigin={corsMode || undefined}
        onClick={(e) => {
          e.stopPropagation();
          togglePlayPause();
        }}
      />

      {/* Big play button overlay */}
      {isPaused && (
        <div
          className='play-overlay'
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}>
          <div className='play-button-large'>
            <svg width='64' height='64' viewBox='0 0 24 24' fill='currentColor'>
              <path d='M8 5v14l11-7z' />
            </svg>
          </div>
        </div>
      )}

      {/* Custom controls */}
      {controls && (
        <div className={`controls ${showControls ? 'visible' : 'hidden'}`}>
          <div className='progress-container'>
            <input
              type='range'
              className='progress-bar'
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
            />
          </div>

          <div className='controls-row'>
            <div className='controls-left'>
              <button
                className='control-button'
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}>
                {isPaused ? (
                  <svg
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='currentColor'>
                    <path d='M8 5v14l11-7z' />
                  </svg>
                ) : (
                  <svg
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='currentColor'>
                    <path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z' />
                  </svg>
                )}
              </button>

              <div className='volume-control'>
                <button
                  className='control-button'
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}>
                  {isMuted || volume === 0 ? (
                    <svg
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='currentColor'>
                      <path d='M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z' />
                    </svg>
                  ) : (
                    <svg
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='currentColor'>
                      <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z' />
                    </svg>
                  )}
                </button>
                <input
                  type='range'
                  className='volume-bar'
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                />
              </div>

              {isFullscreen && (
                <button
                  type='button'
                  className={`control-button${
                    fillViewport ? ' fill-toggle-active' : ''
                  }`}
                  title={
                    fillViewport
                      ? 'Show full frame (letterbox)'
                      : 'Fill screen (crop edges)'
                  }
                  aria-label={
                    fillViewport
                      ? 'Show full frame with letterboxing'
                      : 'Zoom video to fill the screen'
                  }
                  aria-pressed={fillViewport}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFillViewport((v) => !v);
                    showControlsTemporarily();
                  }}>
                  {fillViewport ? (
                    <svg
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                      aria-hidden>
                      <path d='M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z' />
                    </svg>
                  ) : (
                    <svg
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                      aria-hidden>
                      <path d='M17 4h3c1.1 0 2 .9 2 2v2h-2V6h-3V4zM4 8V6h3V4H4c-1.1 0-2 .9-2 2v2h2zm16 8v2h-3v2h3c1.1 0 2-.9 2-2v-2h-2zM7 18H4v-2H2v2c0 1.1.9 2 2 2h3v-2zM18 8H6v8h12V8z' />
                    </svg>
                  )}
                </button>
              )}

              <div className='time-display'>
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className='controls-right'>
              <button
                className='control-button'
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}>
                {isFullscreen ? (
                  <svg
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='currentColor'>
                    <path d='M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z' />
                  </svg>
                ) : (
                  <svg
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='currentColor'>
                    <path d='M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z' />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HTML5Player;
