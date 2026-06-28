/**
 * STORAGE CONFIGURATION SERVICE
 *
 * Manages storage preferences and provides centralized configuration for
 * choosing between localStorage, backend-only, or hybrid approaches
 */

export interface StorageConfig {
  // Core storage strategy
  useBackendFirst: boolean;
  enableLocalStorageFallback: boolean;
  backendOnly: boolean;

  // Performance settings
  backgroundSync: boolean;
  syncRetries: number;
  syncTimeoutMs: number;

  // Cache TTL settings (in seconds)
  defaultTtl: number;
  favoritesTtl: number;
  coverImagesTtl: number;
  streamUrlsTtl: number;

  // Debug settings
  enableDebugLogging: boolean;
  verboseErrors: boolean;
}

import { backendUrl } from '../config/env';

class StorageConfigService {
  private readonly CONFIG_KEY = 'torrent_storage_config';
  private readonly BACKEND_URL = backendUrl;

  private defaultConfig: StorageConfig = {
    // Core storage strategy - configurable via environment or UI
    // Changed to enable backend-first by default for universal data sharing
    useBackendFirst: process.env.REACT_APP_USE_BACKEND_FIRST !== 'false', // Default to true unless explicitly disabled
    enableLocalStorageFallback:
      process.env.REACT_APP_ENABLE_LOCALSTORAGE_FALLBACK !== 'false',
    backendOnly: process.env.REACT_APP_BACKEND_ONLY === 'true',

    // Performance settings
    backgroundSync: true,
    syncRetries: 3,
    syncTimeoutMs: 5000,

    // Cache TTL settings (in seconds)
    defaultTtl: 24 * 60 * 60, // 24 hours
    favoritesTtl: 365 * 24 * 60 * 60, // 1 year (permanent)
    coverImagesTtl: 30 * 24 * 60 * 60, // 30 days
    streamUrlsTtl: 6 * 60 * 60, // 6 hours (Real-Debrid expiry)

    // Debug settings
    enableDebugLogging: process.env.NODE_ENV === 'development',
    verboseErrors: process.env.NODE_ENV === 'development',
  };

  private currentConfig: StorageConfig;

  constructor() {
    this.currentConfig = this.loadConfig();

    // Auto-detect incognito mode and switch to backend-only if needed
    this.detectIncognitoMode();

    // Auto-detect if backend is available on startup
    this.detectBackendAvailability();
  }

  /**
   * Get current storage configuration
   */
  getConfig(): StorageConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update storage configuration
   */
  updateConfig(updates: Partial<StorageConfig>): void {
    this.currentConfig = {
      ...this.currentConfig,
      ...updates,
    };

    this.saveConfig();
    this.log('Configuration updated:', updates);
  }

  /**
   * Check if backend storage should be used first
   */
  shouldUseBackendFirst(): boolean {
    return this.currentConfig.useBackendFirst;
  }

  /**
   * Check if only backend storage should be used (no localStorage)
   */
  isBackendOnly(): boolean {
    return this.currentConfig.backendOnly;
  }

  /**
   * Check if localStorage fallback is enabled and actually available
   */
  hasLocalStorageFallback(): boolean {
    if (this.currentConfig.backendOnly) {
      return false;
    }

    if (!this.currentConfig.enableLocalStorageFallback) {
      return false;
    }

    // Test if localStorage is actually available
    try {
      const testKey = '__storage_availability_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      // localStorage is not available (likely strict incognito mode)
      console.warn('localStorage not available, disabling fallback');
      return false;
    }
  }

  /**
   * Check if background sync is enabled
   */
  shouldBackgroundSync(): boolean {
    return this.currentConfig.backgroundSync;
  }

  /**
   * Get TTL for a specific cache type
   */
  getTtl(
    cacheType:
      | 'favorites'
      | 'coverImages'
      | 'streamUrls'
      | 'default'
  ): number {
    switch (cacheType) {
      case 'favorites':
        return this.currentConfig.favoritesTtl;
      case 'coverImages':
        return this.currentConfig.coverImagesTtl;
      case 'streamUrls':
        return this.currentConfig.streamUrlsTtl;
      default:
        return this.currentConfig.defaultTtl;
    }
  }

  /**
   * Enable backend-only mode (disable localStorage completely)
   */
  enableBackendOnlyMode(): void {
    this.updateConfig({
      backendOnly: true,
      useBackendFirst: true,
      enableLocalStorageFallback: false,
    });

  }

  /**
   * Enable hybrid mode (backend first with localStorage fallback)
   */
  enableHybridMode(): void {
    this.updateConfig({
      backendOnly: false,
      useBackendFirst: true,
      enableLocalStorageFallback: true,
    });

  }

  /**
   * Enable localStorage-only mode (legacy mode for offline use)
   */
  enableLocalStorageOnlyMode(): void {
    this.updateConfig({
      backendOnly: false,
      useBackendFirst: false,
      enableLocalStorageFallback: true,
      backgroundSync: false,
    });

  }

  /**
   * Enable universal backend sync mode (backend-first across all sessions)
   * This ensures synced data is available across all browser sessions and windows
   */
  enableUniversalBackendSyncMode(): void {
    this.updateConfig({
      backendOnly: false,
      useBackendFirst: true,
      enableLocalStorageFallback: true,
      backgroundSync: true,
    });

  }

  /**
   * Auto-detect backend availability and adjust configuration
   */
  private async detectBackendAvailability(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`${this.BACKEND_URL}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.log('Backend detected as available');

        // Auto-enable backend-first mode for universal data sharing
        if (
          !this.currentConfig.useBackendFirst &&
          !this.currentConfig.backendOnly
        ) {

          this.enableUniversalBackendSyncMode();
        } else if (this.currentConfig.useBackendFirst) {

        }
      } else {
        this.handleBackendUnavailable();
      }
    } catch (error) {
      this.handleBackendUnavailable();
    }
  }

  /**
   * Detect if running in incognito/private browsing mode
   */
  private detectIncognitoMode(): void {
    // Multiple methods to detect incognito mode across different browsers
    let isIncognito = false;

    try {
      // Method 1: Try to access localStorage and check if it throws or has limited storage
      if (typeof Storage !== 'undefined') {
        try {
          const testKey = '__storage_test__';
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);

          // Method 2: Check storage quota (incognito mode usually has very limited quota)
          if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage
              .estimate()
              .then((estimate) => {
                // In incognito mode, quota is typically very small (< 10MB)
                if (estimate.quota && estimate.quota < 10 * 1024 * 1024) {
                  this.handleIncognitoModeDetected();
                }
              })
              .catch(() => {
                // If storage.estimate() fails, likely incognito
                this.handleIncognitoModeDetected();
              });
          }
        } catch (e) {
          // localStorage access failed, likely incognito mode
          isIncognito = true;
        }
      }

      // Method 3: Check for webkitRequestFileSystem (Safari private mode detection)
      if ('webkitRequestFileSystem' in window) {
        try {
          (window as any).webkitRequestFileSystem(
            (window as any).TEMPORARY,
            1,
            () => {
              // Success means not incognito
            },
            () => {
              // Failure indicates incognito mode
              isIncognito = true;
              this.handleIncognitoModeDetected();
            }
          );
        } catch (e) {
          // Method failed, but don't assume incognito
        }
      }

      // Method 4: Check indexedDB storage limit (Firefox private mode)
      if ('indexedDB' in window) {
        try {
          const db = indexedDB.open('test');
          db.onsuccess = () => {
            // Normal mode detected
            if (db.result) {
              db.result.close();
            }
          };
          db.onerror = () => {
            // Might be incognito mode
            isIncognito = true;
            this.handleIncognitoModeDetected();
          };
        } catch (e) {
          // IndexedDB access failed
          isIncognito = true;
        }
      }

      // If we detected incognito through localStorage test
      if (isIncognito) {
        this.handleIncognitoModeDetected();
      }
    } catch (error) {
      // If any detection method fails, assume normal mode but log the issue
      console.warn('Failed to detect incognito mode:', error);
    }
  }

  /**
   * Handle incognito mode detection
   */
  private handleIncognitoModeDetected(): void {

    // Force backend-only mode in incognito
    this.updateConfig({
      backendOnly: true,
      useBackendFirst: true,
      enableLocalStorageFallback: false,
      backgroundSync: true, // Enable background sync since we're using backend
    });

    // Show user notification about the mode switch
    if (typeof window !== 'undefined' && window.console) {
      console.info(
        '🔒 Private browsing detected: Data will be stored on backend for persistence across sessions'
      );
    }
  }

  /**
   * Handle backend unavailability
   */
  private handleBackendUnavailable(): void {
    this.log('Backend not available, falling back to localStorage-only mode');

    if (this.currentConfig.backendOnly) {
      console.warn(
        '⚠️ Backend-only mode is enabled but backend is unavailable. Enabling localStorage fallback.'
      );
      this.updateConfig({
        backendOnly: false,
        enableLocalStorageFallback: true,
      });
    }
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): StorageConfig {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.defaultConfig, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load storage config from localStorage:', error);
      // If localStorage is not available, force backend-only mode
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {

        return {
          ...this.defaultConfig,
          backendOnly: true,
          useBackendFirst: true,
          enableLocalStorageFallback: false,
        };
      }
    }

    return { ...this.defaultConfig };
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.currentConfig));
    } catch (error) {
      console.warn('Failed to save storage config to localStorage:', error);
      // If we can't save to localStorage, we should be in backend-only mode
      if (this.currentConfig.enableLocalStorageFallback) {

        this.currentConfig = {
          ...this.currentConfig,
          backendOnly: true,
          enableLocalStorageFallback: false,
        };
      }
    }
  }

  /**
   * Log debug messages if enabled
   */
  private log(message: string, data?: any): void {
    if (this.currentConfig.enableDebugLogging) {

    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.currentConfig = { ...this.defaultConfig };
    this.saveConfig();

  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): {
    mode: string;
    backendUrl: string;
    features: string[];
    ttls: Record<string, number>;
  } {
    let mode = 'Unknown';
    if (this.currentConfig.backendOnly) {
      mode = 'Backend Only';
    } else if (
      this.currentConfig.useBackendFirst &&
      this.currentConfig.enableLocalStorageFallback
    ) {
      mode = 'Hybrid (Backend + localStorage)';
    } else if (!this.currentConfig.useBackendFirst) {
      mode = 'localStorage Only';
    }

    const features: string[] = [];
    if (this.currentConfig.backgroundSync) features.push('Background Sync');
    if (this.currentConfig.enableDebugLogging) features.push('Debug Logging');
    if (this.currentConfig.verboseErrors) features.push('Verbose Errors');

    return {
      mode,
      backendUrl: this.BACKEND_URL,
      features,
      ttls: {
        favorites: this.currentConfig.favoritesTtl,
        coverImages: this.currentConfig.coverImagesTtl,
        streamUrls: this.currentConfig.streamUrlsTtl,
        default: this.currentConfig.defaultTtl,
      },
    };
  }
}

// Export singleton instance
export const storageConfig = new StorageConfigService();

// Expose to window for development/debugging
if (process.env.NODE_ENV === 'development') {
  (window as any).storageConfig = {
    getConfig: () => storageConfig.getConfig(),
    updateConfig: (updates: Partial<StorageConfig>) =>
      storageConfig.updateConfig(updates),
    enableBackendOnly: () => storageConfig.enableBackendOnlyMode(),
    enableHybrid: () => storageConfig.enableHybridMode(),
    enableLocalStorageOnly: () => storageConfig.enableLocalStorageOnlyMode(),
    enableUniversalSync: () => storageConfig.enableUniversalBackendSyncMode(),
    resetToDefaults: () => storageConfig.resetToDefaults(),
    getConfigSummary: () => storageConfig.getConfigSummary(),
  };

}

export default storageConfig;
