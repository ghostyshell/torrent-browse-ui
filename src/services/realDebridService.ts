import { streamUrlCache } from '../utils/streamUrlCache';

import { androidApiConfig } from './androidApiConfig';
import { getAuthHeaders } from './authSession';

interface AddMagnetResponse {
  id: string;
  uri: string;
}

interface TorrentInfo {
  id: string;
  filename: string;
  hash: string;
  bytes: number;
  host: string;
  split: number;
  progress: number;
  status: string;
  added: string;
  files: Array<{
    id: number;
    path: string;
    bytes: number;
    selected: number;
  }>;
  links: string[];
}

interface UnrestrictResponse {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  chunks: number;
  crc: number;
  download: string;
  streamable: number;
}

class RealDebridService {
  private configured = false;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = `${androidApiConfig.getBackendUrl()}/api/proxy/real-debrid`;
  }

  setConfigured(configured: boolean): void {
    this.configured = configured;
  }

  clearApiKey(): void {
    this.configured = false;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.configured) {
      throw new Error(
        'Real-Debrid API key is not configured. Please configure your API key in Account Settings to enable premium streaming.'
      );
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = getAuthHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    });

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Real-Debrid API error: ${response.status}`;

        switch (response.status) {
          case 401:
            errorMessage =
              'Authentication required. Please sign in again to use Real-Debrid streaming.';
            break;
          case 400:
            errorMessage =
              'Real-Debrid API key is not configured. Please add it in Account Settings.';
            break;
          case 403:
            errorMessage =
              'Access forbidden. Your Real-Debrid account may not have sufficient permissions.';
            break;
          case 503:
            errorMessage =
              'Real-Debrid service is temporarily unavailable. Please try again later.';
            break;
          default:
            errorMessage += ` - ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return {} as T;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength === '0') {
        return {} as T;
      }

      const text = await response.text();
      if (!text.trim()) {
        return {} as T;
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid JSON response from Real-Debrid API: ${text.substring(0, 200)}...`
        );
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          'Network error. Please check your internet connection.'
        );
      }
      throw error;
    }
  }

  async addMagnet(magnetLink: string): Promise<AddMagnetResponse> {
    const body = new URLSearchParams();
    body.append('magnet', magnetLink);

    return this.makeRequest<AddMagnetResponse>('/torrents/addMagnet', {
      method: 'POST',
      body,
    });
  }

  async getTorrentInfo(torrentId: string): Promise<TorrentInfo> {
    return this.makeRequest<TorrentInfo>(`/torrents/info/${torrentId}`);
  }

  async selectFiles(torrentId: string, fileIds: string): Promise<void> {
    const body = new URLSearchParams();
    body.append('files', fileIds);

    return this.makeRequest<void>(`/torrents/selectFiles/${torrentId}`, {
      method: 'POST',
      body,
    });
  }

  async unrestrictLink(link: string): Promise<UnrestrictResponse> {
    const body = new URLSearchParams();
    body.append('link', link);

    return this.makeRequest<UnrestrictResponse>('/unrestrict/link', {
      method: 'POST',
      body,
    });
  }

  private isVideoFile(filename: string): boolean {
    const videoExtensions = [
      '.mp4',
      '.mkv',
      '.avi',
      '.mov',
      '.wmv',
      '.flv',
      '.webm',
      '.m4v',
      '.3gp',
      '.mpg',
      '.mpeg',
      '.ogv',
      '.ts',
      '.m2ts',
    ];

    const lowerName = filename.toLowerCase();
    return videoExtensions.some((ext) => lowerName.endsWith(ext));
  }

  private getLargestVideoFile(files: TorrentInfo['files']) {
    const videoFiles = files.filter((file) => this.isVideoFile(file.path));

    if (videoFiles.length === 0) {
      throw new Error('No video files found in torrent');
    }

    return videoFiles.reduce((largest, current) =>
      current.bytes > largest.bytes ? current : largest
    );
  }

  async getStreamableVideoUrl(
    magnetLink: string,
    forceRefresh: boolean = false
  ): Promise<{
    streamUrl: string;
    filename: string;
    filesize: number;
    supportsRangeRequests?: boolean;
  }> {
    if (!magnetLink || !magnetLink.startsWith('magnet:')) {
      throw new Error('Invalid magnet link provided');
    }

    const cachedResult = await streamUrlCache.get(magnetLink, forceRefresh);
    if (cachedResult) {
      return {
        streamUrl: cachedResult.streamUrl,
        filename: cachedResult.filename,
        filesize: cachedResult.filesize,
        supportsRangeRequests: cachedResult.supportsRangeRequests,
      };
    }

    const addResponse = await this.addMagnet(magnetLink);
    if (!addResponse.id) {
      throw new Error('Failed to add magnet to Real-Debrid');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const torrentInfo = await this.getTorrentInfo(addResponse.id);
    if (!torrentInfo.files || torrentInfo.files.length === 0) {
      throw new Error('No files found in torrent');
    }

    const videoFile = this.getLargestVideoFile(torrentInfo.files);
    await this.selectFiles(addResponse.id, videoFile.id.toString());
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const updatedInfo = await this.getTorrentInfo(addResponse.id);
    if (!updatedInfo.links || updatedInfo.links.length === 0) {
      throw new Error(
        'No download links available. The torrent may not be cached on Real-Debrid servers.'
      );
    }

    const unrestrictResponse = await this.unrestrictLink(updatedInfo.links[0]);
    if (!unrestrictResponse.download) {
      throw new Error('Failed to get streamable download link');
    }

    const result = {
      streamUrl: unrestrictResponse.download,
      filename: unrestrictResponse.filename || 'Unknown',
      filesize: unrestrictResponse.filesize || 0,
      supportsRangeRequests: this.checkRangeRequestSupport(unrestrictResponse.host),
    };

    await streamUrlCache.set(magnetLink, result);
    return result;
  }

  async deepRefreshStreamUrl(
    magnetLink: string,
    torrentName?: string
  ): Promise<{
    streamUrl: string;
    filename: string;
    filesize: number;
    supportsRangeRequests?: boolean;
  }> {
    if (!this.configured) {
      throw new Error(
        'Real-Debrid API key is not configured. Please configure your API key in Account Settings to enable premium streaming.'
      );
    }

    const url = `${androidApiConfig.getBackendUrl()}/api/cache/stream-url/refresh`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ magnetLink, torrentName }),
    });

    const text = await response.text();
    let parsed: any = {};
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // fall through
      }
    }

    if (!response.ok || !parsed.success) {
      throw new Error(
        parsed.error || parsed.message || `Deep refresh failed: ${response.status}`
      );
    }

    const result = {
      streamUrl: parsed.streamUrl,
      filename: parsed.filename || 'Unknown',
      filesize: parsed.filesize || 0,
      supportsRangeRequests: !!parsed.supportsRangeRequests,
    };

    await streamUrlCache.set(magnetLink, result);
    return result;
  }

  private checkRangeRequestSupport(host: string): boolean {
    const supportedHosts = ['real-debrid.com', 'rdeb.io', 'rdb.io'];
    return supportedHosts.some((supportedHost) =>
      host.toLowerCase().includes(supportedHost.toLowerCase())
    );
  }

  hasCachedStreamUrl(magnetLink: string): boolean {
    return streamUrlCache.hasLocal(magnetLink);
  }

  async hasCachedStreamUrlAsync(magnetLink: string): Promise<boolean> {
    return streamUrlCache.has(magnetLink);
  }

  async getCachedStreamUrl(magnetLink: string): Promise<{
    streamUrl: string;
    filename: string;
    filesize: number;
    supportsRangeRequests?: boolean;
  } | null> {
    const cached = await streamUrlCache.get(magnetLink);
    if (!cached) return null;

    return {
      streamUrl: cached.streamUrl,
      filename: cached.filename,
      filesize: cached.filesize,
      supportsRangeRequests: cached.supportsRangeRequests,
    };
  }

  async getCachedStreamUrlWithTimestamp(magnetLink: string): Promise<{
    streamUrl: string;
    filename: string;
    filesize: number;
    supportsRangeRequests?: boolean;
    timestamp: number;
  } | null> {
    const cached = await streamUrlCache.get(magnetLink);
    if (!cached) return null;

    return {
      streamUrl: cached.streamUrl,
      filename: cached.filename,
      filesize: cached.filesize,
      supportsRangeRequests: cached.supportsRangeRequests,
      timestamp: cached.timestamp,
    };
  }

  isCachedStreamUrlExpired(timestamp: number): boolean {
    const hoursSinceCache = (Date.now() - timestamp) / (1000 * 60 * 60);
    return hoursSinceCache > 4;
  }

  async clearCachedStreamUrl(magnetLink: string): Promise<boolean> {
    return streamUrlCache.delete(magnetLink);
  }

  async forceClearCachedStreamUrl(magnetLink: string): Promise<boolean> {
    return streamUrlCache.forceDelete(magnetLink);
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async testApiKey(): Promise<boolean> {
    try {
      await this.makeRequest('/user');
      return true;
    } catch {
      return false;
    }
  }
}

export const realDebridService = new RealDebridService();
