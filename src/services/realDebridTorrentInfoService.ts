import { realDebridService } from './realDebridService';

interface TorrentInfoFromAPI {
  id?: string;
  filename?: string;
  hash?: string;
  bytes?: number;
  files?: Array<{
    id: number;
    path: string;
    bytes: number;
    selected: number;
  }>;
  status?: string;
  progress?: number;
  timestamp?: number; // For caching
}

class RealDebridTorrentInfoService {
  private infoCache = new Map<string, TorrentInfoFromAPI>();
  private readonly STORAGE_KEY = 'rd_torrent_info_cache';
  private requestQueue: Array<{ magnetLink: string; resolve: (value: TorrentInfoFromAPI | null) => void; reject: (error: any) => void }> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Load cached torrent info from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, entry] of Object.entries(data)) {
          this.infoCache.set(key, entry as TorrentInfoFromAPI);
        }

      }
    } catch (error) {

      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Save torrent info cache to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      const data: { [key: string]: TorrentInfoFromAPI } = {};
      this.infoCache.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {

    }
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      try {
        // Ensure minimum interval between requests
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }

        const result = await this.getTorrentInfoDirect(request.magnetLink);
        this.lastRequestTime = Date.now();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get torrent info from Real-Debrid API for a magnet link (with queue)
   * This will add the magnet to RD temporarily to get the info
   */
  async getTorrentInfo(magnetLink: string): Promise<TorrentInfoFromAPI | null> {
    // Check cache first (no expiry - permanent cache)
    const cached = this.infoCache.get(magnetLink);
    if (cached) {
      return cached;
    }

    // Add to queue and return a promise
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ magnetLink, resolve, reject });
      this.processQueue().catch(reject);
    });
  }

  /**
   * Direct API call without queueing (internal use)
   */
  private async getTorrentInfoDirect(magnetLink: string): Promise<TorrentInfoFromAPI | null> {
    try {
      // Double-check cache in case it was added while queued
      const cached = this.infoCache.get(magnetLink);
      if (cached) {
        return cached;
      }

      // Step 1: Add magnet to Real-Debrid to get torrent ID
      const addResponse = await realDebridService.addMagnet(magnetLink);

      if (!addResponse.id) {
        return null;
      }

      // Wait a moment for torrent to be processed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 2: Get torrent info
      const torrentInfo = await realDebridService.getTorrentInfo(
        addResponse.id
      );

      const info: TorrentInfoFromAPI = {
        id: torrentInfo.id,
        filename: torrentInfo.filename,
        hash: torrentInfo.hash,
        bytes: torrentInfo.bytes,
        files: torrentInfo.files,
        status: torrentInfo.status,
        progress: torrentInfo.progress,
        timestamp: Date.now(),
      };

      // Cache the result permanently
      this.infoCache.set(magnetLink, info);
      this.saveToLocalStorage();

      return info;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract the best title from torrent info
   */
  extractTitle(torrentInfo: TorrentInfoFromAPI): string {
    if (!torrentInfo) return 'Unknown';

    // Use filename if available, clean it up
    if (torrentInfo.filename) {
      return this.cleanTorrentName(torrentInfo.filename);
    }

    // Fallback to first file name if available
    if (torrentInfo.files && torrentInfo.files.length > 0) {
      const firstFile = torrentInfo.files[0];
      if (firstFile.path) {
        const fileName = firstFile.path.split('/').pop() || firstFile.path;
        return this.cleanTorrentName(fileName);
      }
    }

    return 'Unknown Torrent';
  }

  /**
   * Clean up torrent name by removing common noise
   */
  private cleanTorrentName(name: string): string {
    return (
      name
        // Remove file extensions
        .replace(
          /\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v|3gp|mpg|mpeg|ogv|ts|m2ts)$/i,
          ''
        )
        // Remove common quality indicators
        .replace(
          /\b(1080p|720p|480p|4K|2160p|HDTV|BluRay|BRRip|DVDRip|WEBRip|WEB-DL)\b/gi,
          ''
        )
        // Remove codec info
        .replace(/\b(x264|x265|H\.264|H\.265|HEVC|AVC)\b/gi, '')
        // Remove release group tags
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        // Remove extra spaces and dashes
        .replace(/[-_.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Preload torrent info for multiple magnet links in the background
   * Useful for cached links to avoid loading spinners
   */
  async preloadTorrentInfo(magnetLinks: string[]): Promise<void> {

    const magnetsToLoad = magnetLinks.filter(
      (link) =>
        link.toLowerCase().startsWith('magnet:') && !this.infoCache.has(link)
    );

    if (magnetsToLoad.length === 0) {

      return;
    }

    // Load them one by one to avoid overwhelming the API
    for (const magnetLink of magnetsToLoad) {
      try {
        await this.getTorrentInfo(magnetLink);
        // Small delay between requests to be respectful to the API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {

      }
    }

  }

  /**
   * Get enhanced title for a magnet link (cached or fetch)
   */
  async getEnhancedTitle(magnetLink: string): Promise<string | null> {
    if (!magnetLink.toLowerCase().startsWith('magnet:')) {
      return null;
    }

    try {
      const torrentInfo = await this.getTorrentInfo(magnetLink);
      return torrentInfo ? this.extractTitle(torrentInfo) : null;
    } catch (error) {

      return null;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.infoCache.clear();
    localStorage.removeItem(this.STORAGE_KEY);

  }

  /**
   * Get cache stats
   */
  getCacheStats(): {
    count: number;
    keys: string[];
    totalSizeEstimate: string;
  } {
    const keys = Array.from(this.infoCache.keys());
    const totalSizeEstimate = this.estimateCacheSize();

    return {
      count: this.infoCache.size,
      keys,
      totalSizeEstimate,
    };
  }

  /**
   * Estimate cache size (rough calculation)
   */
  private estimateCacheSize(): string {
    let totalSize = 0;
    this.infoCache.forEach((info) => {
      // Rough estimate: each entry is about 1-5KB depending on file count
      totalSize += JSON.stringify(info).length * 2; // * 2 for UTF-16 encoding
    });

    if (totalSize < 1024) return `${totalSize} B`;
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`;
    return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export const realDebridTorrentInfoService = new RealDebridTorrentInfoService();
