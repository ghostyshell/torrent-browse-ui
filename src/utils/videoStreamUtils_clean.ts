/**
 * Utility functions for handling video streaming, particularly for Real-Debrid streams
 * Updated to work with Video.js player
 */

/**
 * Check if a video element can seek to a specific time
 * @deprecated - Video.js handles seeking internally
 */
export const canSeekToTime = (
  video: HTMLVideoElement,
  time: number
): boolean => {
  if (!video.seekable || video.seekable.length === 0) {
    return false;
  }

  for (let i = 0; i < video.seekable.length; i++) {
    if (time >= video.seekable.start(i) && time <= video.seekable.end(i)) {
      return true;
    }
  }

  return false;
};

/**
 * Get the buffered percentage of a video
 * @deprecated - Video.js provides buffering information through its API
 */
export const getBufferedPercentage = (video: HTMLVideoElement): number => {
  if (!video.buffered || video.buffered.length === 0 || !video.duration) {
    return 0;
  }

  // Find the buffered range that contains the current time
  const currentTime = video.currentTime;
  for (let i = 0; i < video.buffered.length; i++) {
    if (
      currentTime >= video.buffered.start(i) &&
      currentTime <= video.buffered.end(i)
    ) {
      return (video.buffered.end(i) / video.duration) * 100;
    }
  }

  // If no range contains current time, return the percentage of the largest buffered range
  let maxBuffered = 0;
  for (let i = 0; i < video.buffered.length; i++) {
    maxBuffered = Math.max(maxBuffered, video.buffered.end(i));
  }

  return (maxBuffered / video.duration) * 100;
};

/**
 * Get seekable ranges as an array of {start, end} objects
 * @deprecated - Video.js provides seeking information through its API
 */
export const getSeekableRanges = (
  video: HTMLVideoElement
): Array<{ start: number; end: number }> => {
  const ranges: Array<{ start: number; end: number }> = [];

  if (!video.seekable) {
    return ranges;
  }

  for (let i = 0; i < video.seekable.length; i++) {
    ranges.push({
      start: video.seekable.start(i),
      end: video.seekable.end(i),
    });
  }

  return ranges;
};

/**
 * Safely seek to a time in a video element
 * @deprecated - Video.js handles seeking safety internally
 */
export const safeSeek = (video: HTMLVideoElement, time: number): boolean => {
  if (!video.duration || time < 0 || time > video.duration) {
    return false;
  }

  if (!canSeekToTime(video, time)) {
    console.warn(`Cannot seek to time ${time}s - not in seekable ranges`);
    return false;
  }

  try {
    video.currentTime = time;
    return true;
  } catch (error) {
    console.error('Seek error:', error);
    return false;
  }
};

/**
 * Check if a stream URL is likely to support range requests
 */
export const supportsRangeRequests = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Real-Debrid and similar services that typically support range requests
    const supportedServices = [
      'real-debrid.com',
      'rdeb.io',
      'rdb.io',
      'premiumize.me',
      'alldebrid.com',
    ];

    return supportedServices.some((service) => hostname.includes(service));
  } catch {
    return false;
  }
};

/**
 * Format seconds into MM:SS or HH:MM:SS format
 * @deprecated - Video.js has built-in time formatting
 */
export const formatVideoTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Check if URL requires CORS handling
 */
const requiresCorsHandling = (url: string): boolean => {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Real-Debrid and similar services don't support CORS properly
    const noCorsServices = [
      'real-debrid.com',
      'rdeb.io',
      'rdb.io',
      'download.real-debrid.com',
      'premiumize.me',
      'alldebrid.com',
    ];

    return noCorsServices.some((service) => hostname.includes(service));
  } catch {
    return false;
  }
};

/**
 * Get optimal video loading configuration for streaming
 * @deprecated - Video.js handles configuration internally
 */
export const getStreamingVideoConfig = (
  supportsRangeRequests: boolean,
  videoUrl?: string
) => {
  const baseConfig = {
    preload: supportsRangeRequests ? 'metadata' : 'auto',
    playsInline: true,
    controls: false,
    autoPlay: true,
    // For streams that don't support range requests, we might want to preload more
    ...(supportsRangeRequests ? {} : { preload: 'metadata' }),
  };

  // Only add crossOrigin if the URL doesn't require special CORS handling
  if (videoUrl && !requiresCorsHandling(videoUrl)) {
    return {
      ...baseConfig,
      crossOrigin: 'anonymous' as const,
    };
  }

  // For Real-Debrid and similar services, don't set crossOrigin to avoid CORS issues
  return baseConfig;
};

/**
 * Video.js specific utilities
 */

/**
 * Get optimal Video.js player options for streaming services
 */
export const getVideoJSOptions = (
  videoUrl: string,
  supportsRangeRequests: boolean = false
) => {
  const requiresCors = requiresCorsHandling(videoUrl);

  return {
    fluid: true,
    responsive: true,
    preload: supportsRangeRequests ? 'metadata' : 'auto',
    controls: true,
    autoplay: true,
    playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
    html5: {
      vhs: {
        overrideNative: true,
        enableLowInitialPlaylist: !supportsRangeRequests,
        smoothQualityChange: true,
      },
      nativeVideoTracks: false,
      nativeAudioTracks: false,
      nativeTextTracks: false,
      // Don't set crossOrigin for services that don't support CORS
      ...(requiresCors ? {} : { crossorigin: 'anonymous' }),
    },
    userActions: {
      hotkeys: true,
    },
    plugins: {},
  };
};

/**
 * Detect video type from URL
 */
export const detectVideoType = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    if (pathname.includes('.mp4')) return 'video/mp4';
    if (pathname.includes('.webm')) return 'video/webm';
    if (pathname.includes('.avi')) return 'video/avi';
    if (pathname.includes('.mkv')) return 'video/x-matroska';
    if (pathname.includes('.mov')) return 'video/quicktime';
    if (pathname.includes('.wmv')) return 'video/x-ms-wmv';
    if (pathname.includes('.flv')) return 'video/x-flv';
    if (pathname.includes('.m3u8')) return 'application/x-mpegURL';
    if (pathname.includes('.mpd')) return 'application/dash+xml';

    // Default to mp4 for streaming services
    return 'video/mp4';
  } catch {
    return 'video/mp4';
  }
};

/**
 * Check if URL is likely a streaming service
 */
export const isStreamingService = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    const streamingServices = [
      'real-debrid.com',
      'rdeb.io',
      'rdb.io',
      'download.real-debrid.com',
      'premiumize.me',
      'alldebrid.com',
      'putio.com',
      'seedr.cc',
    ];

    return streamingServices.some((service) => hostname.includes(service));
  } catch {
    return false;
  }
};
