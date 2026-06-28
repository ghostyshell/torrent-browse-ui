import axios from 'axios';
import { Torrent } from '../types/Torrent';
import androidApiConfig from './androidApiConfig';

const API_BASE_URL = androidApiConfig.getApiUrl();

// Timeout configuration for different sources
// 1337x uses FlareSolverr which can take 55+ seconds to solve Cloudflare
const SOURCE_TIMEOUTS: Record<string, number> = {
  '1337x': 65000,  // 65 seconds (55s FlareSolverr + 10s buffer)
  default: 30000,  // 30 seconds for other sources
};

// Get timeout for a specific source
const getTimeoutForSource = (website: string): number => {
  return SOURCE_TIMEOUTS[website.toLowerCase()] || SOURCE_TIMEOUTS.default;
};

export const torrentApi = {
  async getAvailableWebsites(): Promise<string[]> {
    try {
      const response = await androidApiConfig.makeRequest<string[]>(
        '/torrents'
      );
      return ['all', ...response];
    } catch (error) {
      console.warn(
        'Failed to fetch available websites, using defaults:',
        androidApiConfig.getErrorMessage(error)
      );
      return ['all', 'piratebay', 'yts', 'nyaasi', 'limetorrent'];
    }
  },

  async searchTorrents(
    query: string,
    website: string,
    page: number = 1,
    minSeeders?: number,
    includeCoverImages?: boolean,
    sort?: string,
    category?: string
  ): Promise<Torrent[]> {
    const searchEndpoint = `/${website}/${encodeURIComponent(query)}/${page}`;

    // Add query parameters for filtering
    const params = new URLSearchParams();
    if (minSeeders && minSeeders > 0) {
      params.append('minSeeders', minSeeders.toString());
    }
    if (includeCoverImages) {
      params.append('includeCoverImages', 'true');
    }
    if (sort) {
      params.append('sort', sort);
    }
    if (category) {
      params.append('category', category);
    }

    const fullEndpoint = params.toString()
      ? `${searchEndpoint}?${params}`
      : searchEndpoint;

    // Use longer timeout for slow sources like 1337x
    const timeout = getTimeoutForSource(website);
    // Don't retry for slow sources - one attempt is enough
    const maxRetries = website.toLowerCase() === '1337x' ? 1 : undefined;

    const response = await androidApiConfig.makeRequest<any>(
      fullEndpoint,
      {},
      timeout,
      maxRetries
    );

    if (response.error) {
      throw new Error(response.error);
    }

    // Handle different response formats
    let torrents: Torrent[] = [];
    if (Array.isArray(response)) {
      torrents = response.map((torrent: Torrent) => ({
        ...torrent,
        Source: website === 'all' ? torrent.Source : website,
      }));
    } else if (response.data && Array.isArray(response.data)) {
      torrents = response.data.map((torrent: Torrent) => ({
        ...torrent,
        Source: website === 'all' ? torrent.Source : website,
      }));
    } else {
      // For combo results, flatten the results
      Object.keys(response).forEach((source) => {
        if (Array.isArray(response[source])) {
          const sourceTorrents = response[source].map((torrent: Torrent) => ({
            ...torrent,
            Source: source,
          }));
          torrents = [...torrents, ...sourceTorrents];
        }
      });
    }

    return torrents;
  },

  async browseTorrents(
    category: string = '507',
    page: number = 1,
    sort: string = '3'
  ): Promise<Torrent[]> {
    const params = new URLSearchParams();
    if (sort !== '3') params.append('sort', sort);

    const endpoint = `/torrents/browse/${category}/${page}${params.toString() ? '?' + params : ''}`;

    const response = await androidApiConfig.makeRequest<any>(endpoint, {}, 30000);

    if (response.error) throw new Error(response.error);

    if (Array.isArray(response)) {
      return response.map((t: Torrent) => ({ ...t, Source: 'piratebay' }));
    }
    return [];
  },

  async getTorrentDetails(
    website: string,
    torrentUrl: string
  ): Promise<{
    description: string;
    files: { name: string; size: string }[];
    comments: { author: string; comment: string; date: string }[];
    images: { originalUrl: string; directUrl: string }[];
    magnet?: string;
    hash?: string;
    error?: string;
  }> {
    try {
      const encodedUrl = encodeURIComponent(torrentUrl);
      const detailsEndpoint = `/torrent-details/${website}/${encodedUrl}`;

      // Use longer timeout for slow sources like 1337x
      const timeout = getTimeoutForSource(website);
      // Don't retry for slow sources
      const maxRetries = website.toLowerCase() === '1337x' ? 1 : undefined;

      const response = await androidApiConfig.makeRequest<any>(
        detailsEndpoint,
        {},
        timeout,
        maxRetries
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return {
        ...response,
        images: response.images || [], // Ensure images array exists
      };
    } catch (error: any) {
      throw new Error(
        androidApiConfig.getErrorMessage(error) ||
          `Failed to fetch torrent details: ${error.message}`
      );
    }
  },
};

// Development tools
if (process.env.NODE_ENV === 'development') {
  (window as any).torrentApi = {
    searchTorrents: (query: string, website: string, page?: number, minSeeders?: number, includeCoverImages?: boolean) =>
      torrentApi.searchTorrents(query, website, page, minSeeders, includeCoverImages),
    getTorrentDetails: (website: string, torrentUrl: string) =>
      torrentApi.getTorrentDetails(website, torrentUrl),
    getAvailableWebsites: () => torrentApi.getAvailableWebsites(),
  };

}
