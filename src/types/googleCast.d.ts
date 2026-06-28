/**
 * Minimal ambient declarations for the Google Cast Web Sender SDK
 * (https://www.gstatic.com/cv/js/sender/v1/cast_sender.js).
 *
 * The SDK injects the `cast` and `chrome.cast` globals at runtime once its
 * script has loaded. We only declare the surface we actually use and keep the
 * shapes permissive — the full Cast typings are large and not published as a
 * first-party @types package for the sender SDK.
 */

interface Window {
  /**
   * Invoked by cast_sender.js once the framework has finished loading.
   * `isAvailable` is false when the SDK could not initialise (e.g. unsupported
   * browser). See googleCastService for the registration.
   */
  __onGCastApiAvailable?: (isAvailable: boolean, reason?: string) => void;
  // The SDK attaches these as globals; typed loosely on purpose (see above).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cast?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chrome?: any;
}

// `cast` and `chrome` are also referenced as bare globals by the SDK examples.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const cast: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;
