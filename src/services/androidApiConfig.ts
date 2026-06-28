/**
 * Android API Configuration Service
 * Handles API configuration for Android WebView environment with retry logic and error handling
 */

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  isAndroid: boolean;
}

interface ServerStatus {
  isAvailable: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

class AndroidApiConfigService {
  private config: ApiConfig;
  private serverStatus: ServerStatus;
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 10000; // 10 seconds
  private readonly SERVER_CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.config = {
      baseUrl: this.getApiBaseUrl(),
      timeout: 30000, // 30 seconds default
      retryAttempts: this.MAX_RETRY_ATTEMPTS,
      retryDelay: this.INITIAL_RETRY_DELAY,
      isAndroid: this.isAndroidEnvironment(),
    };

    this.serverStatus = {
      isAvailable: false,
      lastCheck: 0,
      consecutiveFailures: 0,
    };

    // Start server health monitoring if in Android environment
    if (this.config.isAndroid) {
      this.startServerHealthMonitoring();
    }
  }

  /**
   * Get the API base URL based on environment
   */
  private getApiBaseUrl(): string {
    // First, try environment variables (for production deployments)
    const envUrl = (window.__ENV__?.REACT_APP_API_URL || window.__ENV__?.REACT_APP_BACKEND_URL ||
      process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL);
    if (envUrl && envUrl !== 'http://localhost:3001') {
      return envUrl;
    }

    // In Android WebView, use localhost only if no production URL is set
    if (this.isAndroidEnvironment()) {
      return 'http://localhost:3001';
    }

    // Final fallback
    return 'http://localhost:3001';
  }

  /**
   * Check if running in Android WebView environment
   */
  private isAndroidEnvironment(): boolean {
    return (
      process.env.REACT_APP_PLATFORM === 'android' ||
      process.env.REACT_APP_IS_MOBILE_APP === 'true' ||
      (typeof window !== 'undefined' &&
        window.navigator.userAgent.includes('Android') &&
        window.navigator.userAgent.includes('wv'))
    ); // WebView indicator
  }

  /**
   * Get current API configuration
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  /**
   * Get API base URL with /api suffix
   */
  getApiUrl(): string {
    return `${this.config.baseUrl}/api`;
  }

  /**
   * Get backend base URL
   */
  getBackendUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Check if server is available
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      const isHealthy = response.ok;
      this.updateServerStatus(isHealthy);
      return isHealthy;
    } catch (error) {
      console.warn('Server health check failed:', error);
      this.updateServerStatus(false);
      return false;
    }
  }

  /**
   * Update server status tracking
   */
  private updateServerStatus(isAvailable: boolean): void {
    this.serverStatus.lastCheck = Date.now();

    if (isAvailable) {
      this.serverStatus.isAvailable = true;
      this.serverStatus.consecutiveFailures = 0;
    } else {
      this.serverStatus.isAvailable = false;
      this.serverStatus.consecutiveFailures++;
    }
  }

  /**
   * Start periodic server health monitoring
   */
  private startServerHealthMonitoring(): void {
    // Initial health check
    this.checkServerHealth();

    // Periodic health checks
    setInterval(() => {
      this.checkServerHealth();
    }, this.SERVER_CHECK_INTERVAL);
  }

  /**
   * Make API request with retry logic
   * @param endpoint - API endpoint
   * @param options - Fetch options
   * @param customTimeout - Optional custom timeout in ms (for slow sources like 1337x)
   * @param maxRetries - Optional max retry attempts (default: config.retryAttempts)
   */
  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    customTimeout?: number,
    maxRetries?: number
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.getApiUrl()}${endpoint}`;

    const timeout = customTimeout || this.config.timeout;
    const retryAttempts = maxRetries ?? this.config.retryAttempts;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.updateServerStatus(true);
        return data;
      } catch (error: any) {
        console.warn(`API request attempt ${attempt} failed:`, error);

        // Don't retry on abort - it means the request was intentionally cancelled or timed out
        if (error.name === 'AbortError') {
          const timeoutSeconds = Math.round(timeout / 1000);
          console.error(`Request aborted after ${timeoutSeconds}s timeout for: ${url}`);
          throw new Error(
            `Request timed out after ${timeoutSeconds} seconds. ` +
            `For 1337x searches, the server needs time to bypass Cloudflare protection.`
          );
        }

        if (attempt === retryAttempts) {
          this.updateServerStatus(false);
          throw new Error(
            `API request failed after ${retryAttempts} attempts: ${error}`
          );
        }

        // Wait before retrying with exponential backoff
        const delay = Math.min(
          this.config.retryDelay * Math.pow(2, attempt - 1),
          this.MAX_RETRY_DELAY
        );
        await this.sleep(delay);
      }
    }

    throw new Error('Unexpected error in makeRequest');
  }

  /**
   * Make backend request with retry logic
   */
  async makeBackendRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.getBackendUrl()}${endpoint}`;
    return this.makeRequest<T>(url, options);
  }

  /**
   * Get server status
   */
  getServerStatus(): ServerStatus {
    return { ...this.serverStatus };
  }

  /**
   * Wait for server to become available
   */
  async waitForServer(maxWaitTime: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      if (await this.checkServerHealth()) {
        return true;
      }

      await this.sleep(1000); // Check every second
    }

    return false;
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle network connectivity changes (Android specific)
   */
  handleConnectivityChange(isOnline: boolean): void {
    if (this.config.isAndroid) {
      if (isOnline) {
        // Network is back, check server health
        this.checkServerHealth();
      } else {
        // Network is down, mark server as unavailable
        this.updateServerStatus(false);
      }
    }
  }

  /**
   * Get error message for display to user
   */
  getErrorMessage(error: any): string {
    if (!this.serverStatus.isAvailable) {
      return 'Local server is not available. Please wait for the app to start up completely.';
    }

    if (error.name === 'AbortError') {
      return 'Request timed out. Please check your connection and try again.';
    }

    if (error.message?.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please try again in a moment.';
    }

    return error.message || 'An unexpected error occurred. Please try again.';
  }
}

// Export singleton instance
export const androidApiConfig = new AndroidApiConfigService();
export default androidApiConfig;
