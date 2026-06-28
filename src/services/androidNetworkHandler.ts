/**
 * Android Network Connectivity Handler
 * Manages network connectivity changes and server communication for Android WebView
 */

import androidApiConfig from './androidApiConfig';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  lastChange: number;
}

class AndroidNetworkHandler {
  private networkStatus: NetworkStatus;
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private serverCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.networkStatus = {
      isOnline: navigator.onLine,
      connectionType: this.getConnectionType(),
      lastChange: Date.now(),
    };

    this.initializeNetworkListeners();
  }

  /**
   * Initialize network event listeners
   */
  private initializeNetworkListeners(): void {
    // Standard web API listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Android WebView specific listeners (if available)
    if (this.isAndroidWebView()) {
      this.initializeAndroidListeners();
    }

    // Start periodic server connectivity checks
    this.startServerConnectivityChecks();
  }

  /**
   * Check if running in Android WebView
   */
  private isAndroidWebView(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.navigator.userAgent.includes('Android') &&
      window.navigator.userAgent.includes('wv')
    );
  }

  /**
   * Initialize Android-specific network listeners
   */
  private initializeAndroidListeners(): void {
    // Listen for Android connectivity changes via JavaScript interface
    if ((window as any).Android && (window as any).Android.onNetworkChange) {
      (window as any).Android.onNetworkChange = (
        isConnected: boolean,
        connectionType: string
      ) => {
        this.updateNetworkStatus(isConnected, connectionType);
      };
    }
  }

  /**
   * Get connection type information
   */
  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || connection.type || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.updateNetworkStatus(true, this.getConnectionType());
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.updateNetworkStatus(false, 'none');
  }

  /**
   * Update network status and notify listeners
   */
  private updateNetworkStatus(isOnline: boolean, connectionType: string): void {
    const previousStatus = { ...this.networkStatus };

    this.networkStatus = {
      isOnline,
      connectionType,
      lastChange: Date.now(),
    };

    // Notify Android API config about connectivity change
    androidApiConfig.handleConnectivityChange(isOnline);

    // Notify all listeners if status changed
    if (
      previousStatus.isOnline !== isOnline ||
      previousStatus.connectionType !== connectionType
    ) {
      this.notifyListeners();
    }
  }

  /**
   * Start periodic server connectivity checks
   */
  private startServerConnectivityChecks(): void {
    // Check server connectivity every 30 seconds
    this.serverCheckInterval = setInterval(async () => {
      if (this.networkStatus.isOnline) {
        try {
          await androidApiConfig.checkServerHealth();
        } catch (error) {
          console.warn('Server connectivity check failed:', error);
        }
      }
    }, 30000);
  }

  /**
   * Stop server connectivity checks
   */
  private stopServerConnectivityChecks(): void {
    if (this.serverCheckInterval) {
      clearInterval(this.serverCheckInterval);
      this.serverCheckInterval = null;
    }
  }

  /**
   * Notify all listeners about network status change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.networkStatus);
      } catch (error) {
        console.error('Error notifying network status listener:', error);
      }
    });
  }

  /**
   * Add network status change listener
   */
  addListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove network status change listener
   */
  removeListener(listener: (status: NetworkStatus) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.networkStatus.isOnline;
  }

  /**
   * Wait for network connectivity
   */
  async waitForConnectivity(timeout: number = 30000): Promise<boolean> {
    if (this.networkStatus.isOnline) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.removeListener(onlineListener);
        resolve(false);
      }, timeout);

      const onlineListener = (status: NetworkStatus) => {
        if (status.isOnline) {
          clearTimeout(timeoutId);
          this.removeListener(onlineListener);
          resolve(true);
        }
      };

      this.addListener(onlineListener);
    });
  }

  /**
   * Wait for server availability
   */
  async waitForServer(timeout: number = 30000): Promise<boolean> {
    // First wait for network connectivity
    if (!(await this.waitForConnectivity(timeout))) {
      return false;
    }

    // Then wait for server to be available
    return androidApiConfig.waitForServer(timeout);
  }

  /**
   * Get user-friendly network status message
   */
  getStatusMessage(): string {
    if (!this.networkStatus.isOnline) {
      return 'No internet connection. Please check your network settings.';
    }

    const serverStatus = androidApiConfig.getServerStatus();
    if (!serverStatus.isAvailable) {
      return 'Connecting to local server. Please wait...';
    }

    return 'Connected and ready';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    this.stopServerConnectivityChecks();
    this.listeners = [];
  }
}

// Export singleton instance
export const androidNetworkHandler = new AndroidNetworkHandler();
export default androidNetworkHandler;
