import { useCallback, useEffect, useRef, useState } from 'react';
import {
  googleCastService,
  CastState,
  CastMedia,
} from '../services/googleCastService';
import { detectVideoType } from '../utils/videoStreamUtils';

interface UseGoogleCastArgs {
  /** Direct stream URL to cast (e.g. a Real-Debrid unrestricted link). */
  videoUrl: string;
  /** Human-readable title shown on the receiver. */
  filename: string;
}

interface UseGoogleCastResult {
  /** SDK loaded and at least the framework is usable in this browser. */
  available: boolean;
  /** True only when a Cast device is reachable (button is worth showing). */
  hasDevices: boolean;
  /** Raw 4-value cast state. */
  castState: CastState;
  /** Connected and currently playing *this* video on the receiver. */
  isCastingThis: boolean;
  /** Friendly name of the connected receiver, if any. */
  deviceName: string | null;
  /** Last error surfaced to the user (connect/load failures). */
  error: string | null;
  /** Connect (if needed), then cast this video — or stop if already casting it. */
  toggleCast: () => Promise<void>;
  /** Tear down the current cast session. */
  stopCasting: () => Promise<void>;
}

/**
 * React surface over {@link googleCastService}. Tracks cast state and casts the
 * currently-open video to a Chromecast via the Default Media Receiver.
 */
export const useGoogleCast = ({
  videoUrl,
  filename,
}: UseGoogleCastArgs): UseGoogleCastResult => {
  const [available, setAvailable] = useState(false);
  const [castState, setCastState] = useState<CastState>('NO_DEVICES_AVAILABLE');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // contentId currently loaded on the receiver — drives the "casting this" UI.
  const [loadedContentId, setLoadedContentId] = useState<string | null>(null);

  // Always read the latest media inside async handlers without re-binding them.
  const mediaRef = useRef<CastMedia>({ url: '', title: '', contentType: '' });
  mediaRef.current = {
    url: videoUrl,
    title: filename || 'Video',
    contentType: detectVideoType(videoUrl || ''),
  };

  const syncFromState = useCallback((state: CastState) => {
    setCastState(state);
    setDeviceName(googleCastService.getDeviceName());
    setLoadedContentId(
      state === 'CONNECTED' ? googleCastService.getLoadedContentId() : null
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    googleCastService.init().then((ok) => {
      if (cancelled) return;
      setAvailable(ok);
      if (ok) syncFromState(googleCastService.getCastState());
    });

    const unsubscribe = googleCastService.onStateChanged((state) => {
      if (!cancelled) syncFromState(state);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [syncFromState]);

  const stopCasting = useCallback(async () => {
    await googleCastService.stopCasting();
  }, []);

  const toggleCast = useCallback(async () => {
    const media = mediaRef.current;
    if (!media.url) return;
    setError(null);

    try {
      if (googleCastService.getCastState() !== 'CONNECTED') {
        // Opens the device picker; resolves once a session is established.
        await googleCastService.requestSession();
      } else if (googleCastService.getLoadedContentId() === media.url) {
        // Already casting this exact video → the button acts as "stop".
        await googleCastService.stopCasting();
        return;
      }

      await googleCastService.loadMedia(media);
      setLoadedContentId(media.url);
    } catch (err) {
      // requestSession rejects when the user dismisses the picker — not an error.
      const reason = err instanceof Error ? err.message : String(err);
      if (reason && reason !== 'cancel') {
        console.error('Casting failed:', err);
        setError('Could not cast to the selected device.');
      }
    }
  }, []);

  const isCastingThis =
    castState === 'CONNECTED' && loadedContentId === videoUrl;

  return {
    available,
    hasDevices: available && castState !== 'NO_DEVICES_AVAILABLE',
    castState,
    isCastingThis,
    deviceName,
    error,
    toggleCast,
    stopCasting,
  };
};
