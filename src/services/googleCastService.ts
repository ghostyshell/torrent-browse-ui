/**
 * Thin singleton wrapper around the Google Cast Web Sender SDK.
 *
 * The Cast framework is itself a global singleton, so we load its script and
 * initialise the CastContext exactly once for the whole app. React code should
 * consume this through the `useGoogleCast` hook rather than touching the
 * `cast` / `chrome.cast` globals directly.
 */

const CAST_SENDER_SRC =
  'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

// Well-known id of Google's styled Default Media Receiver. It plays standard
// HTTP(S) MP4/HLS/DASH streams (which is what our Real-Debrid links are) with no
// custom receiver app required. Overridable for deployments that ship their own.
const DEFAULT_MEDIA_RECEIVER_APP_ID = 'CC1AD845';

/** Mirrors chrome.cast.CastState — kept as a string union for React state. */
export type CastState =
  | 'NO_DEVICES_AVAILABLE'
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED';

export interface CastMedia {
  url: string;
  title: string;
  /** MIME type, e.g. "video/mp4". */
  contentType: string;
}

type StateListener = (state: CastState) => void;

class GoogleCastService {
  private loadPromise: Promise<boolean> | null = null;
  private available = false;
  private readonly stateListeners = new Set<StateListener>();

  /** True once the SDK has loaded and a Cast context exists. */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Load the sender SDK and initialise the CastContext. Idempotent — repeated
   * calls return the same promise. Resolves `false` when casting is unsupported
   * (e.g. non-Chromium browser) so callers can hide the cast UI gracefully.
   */
  init(): Promise<boolean> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<boolean>((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      // cast_sender.js calls this once the framework is ready.
      window.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable) {
          try {
            this.configureContext();
            this.available = true;
            resolve(true);
            return;
          } catch (err) {
            console.error('Cast context initialisation failed:', err);
          }
        }
        resolve(false);
      };

      // Reuse an already-injected script (e.g. after a hot reload).
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${CAST_SENDER_SRC}"]`
      );
      if (existing) {
        // If the framework is already up, the global is in place; if the script
        // is still loading it will fire __onGCastApiAvailable itself.
        if (window.cast?.framework) {
          window.__onGCastApiAvailable(true);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = CAST_SENDER_SRC;
      script.async = true;
      script.onerror = () => {
        console.warn('Failed to load Google Cast sender SDK');
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  private configureContext(): void {
    const context = window.cast.framework.CastContext.getInstance();
    const appId =
      process.env.REACT_APP_CAST_RECEIVER_APP_ID ||
      DEFAULT_MEDIA_RECEIVER_APP_ID;

    context.setOptions({
      receiverApplicationId: appId,
      autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });

    context.addEventListener(
      window.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event: any) => {
        const state = (event.castState as CastState) ?? 'NO_DEVICES_AVAILABLE';
        this.stateListeners.forEach((listener) => listener(state));
      }
    );
  }

  /** Current 4-value cast state, or NO_DEVICES_AVAILABLE before init. */
  getCastState(): CastState {
    if (!this.available) return 'NO_DEVICES_AVAILABLE';
    try {
      return window.cast.framework.CastContext.getInstance().getCastState() as CastState;
    } catch {
      return 'NO_DEVICES_AVAILABLE';
    }
  }

  /** Friendly name of the connected receiver, if any (e.g. "Living Room TV"). */
  getDeviceName(): string | null {
    try {
      const session = window.cast.framework.CastContext.getInstance().getCurrentSession();
      return session?.getCastDevice()?.friendlyName ?? null;
    } catch {
      return null;
    }
  }

  /** Subscribe to cast-state changes. Returns an unsubscribe function. */
  onStateChanged(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Open the device-picker dialog and establish a session. Resolves once the
   * user has connected (or rejects/cancels). Safe to call only after init().
   */
  async requestSession(): Promise<void> {
    if (!this.available) {
      throw new Error('Cast SDK is not available');
    }
    await window.cast.framework.CastContext.getInstance().requestSession();
  }

  /** Load (or replace) the media playing on the current cast session. */
  async loadMedia(media: CastMedia): Promise<void> {
    const context = window.cast.framework.CastContext.getInstance();
    const session = context.getCurrentSession();
    if (!session) {
      throw new Error('No active cast session');
    }

    const mediaInfo = new window.chrome.cast.media.MediaInfo(
      media.url,
      media.contentType
    );
    mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = media.title;

    const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
    await session.loadMedia(request);
  }

  /** contentId of whatever is currently loaded on the receiver, if anything. */
  getLoadedContentId(): string | null {
    try {
      const session = window.cast.framework.CastContext.getInstance().getCurrentSession();
      return session?.getMediaSession()?.media?.contentId ?? null;
    } catch {
      return null;
    }
  }

  /** Tear down the current session (stops casting). */
  async stopCasting(): Promise<void> {
    if (!this.available) return;
    try {
      await window.cast.framework.CastContext.getInstance().endCurrentSession(
        true
      );
    } catch (err) {
      console.error('Failed to stop casting:', err);
    }
  }
}

export const googleCastService = new GoogleCastService();
