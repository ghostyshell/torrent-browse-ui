/**
 * GOOGLE IMAGES SEARCH SERVICE
 *
 * This service provides functionality to search Google Images using a proxy
 * to avoid CORS issues. It returns image results that can be displayed
 * similar to the existing torrent images section.
 */

import androidApiConfig from './androidApiConfig';

interface GoogleImageResult {
  url: string;
  title: string;
  thumbnail: string;
  width: number;
  height: number;
  source: string;
}

class GoogleImagesService {
  private readonly BACKEND_URL = androidApiConfig.getBackendUrl();

  /**
   * Search Google Images for a given query using Google Custom Search API
   */
  async searchImages(
    query: string,
    limit: number = 20
  ): Promise<GoogleImageResult[]> {
    try {
      const cleanedQuery = this.cleanQuery(query);

      return await this.searchWithCustomSearchAPI(cleanedQuery, limit);
    } catch (error) {
      throw new Error(
        'Image search failed. Please check your API credentials or try again later.'
      );
    }
  }

  /**
   * Search using backend proxy API (uses service account authentication)
   */
  private async searchWithCustomSearchAPI(
    query: string,
    limit: number
  ): Promise<GoogleImageResult[]> {
    try {
      const searchEndpoint = `/api/google-images/search?q=${encodeURIComponent(
        query
      )}&limit=${limit}`;

      const data = await androidApiConfig.makeBackendRequest<any>(searchEndpoint);

      if (!data.success) {
        throw new Error(`Backend API error: ${data.error}`);
      }

      if (!data.results || data.results.length === 0) {
        return [];
      }

      return data.results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clean and prepare search query
   */
  private cleanQuery(query: string): string {
    // Remove common torrent-related terms that might not be useful for image search
    let cleanedQuery = query
      .replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm)$/i, '')
      .replace(
        /\b(1080p|720p|480p|4k|hd|BluRay|BDRip|HDRip|WEBRip|DVDRip|BrRip)\b/gi,
        ''
      )
      .replace(/\b(x264|x265|HEVC|H\.264|H\.265|AVC|AAC|AC3)\b/gi, '')
      .replace(/\b(P2P|RARBG|YTS|ETRG|WRB)\b/gi, '') // Remove release group tags (keep XXX as it might be useful)
      .replace(/\[\w+\]/g, '') // Remove tags in square brackets
      .replace(/\(\d{4}\)/g, '') // Remove year in parentheses
      .replace(/\b\d{2}\s\d{2}\s\d{2}\b/g, '') // Remove date patterns like "25 08 21"
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Instead of aggressive filtering, just return the cleaned query
    // This preserves studio names, performer names, and content titles
    return cleanedQuery;
  }

  /**
   * Generate search suggestions based on torrent name
   */
  async generateSearchSuggestions(torrentName: string): Promise<string[]> {
    try {
      const searchUrl = `${
        this.BACKEND_URL
      }/api/google-images/suggestions?q=${encodeURIComponent(torrentName)}`;

      const response = await fetch(searchUrl);

      if (!response.ok) {
        return this.generateLocalSuggestions(torrentName);
      }

      const data = await response.json();

      if (data.success && data.suggestions) {
        return data.suggestions;
      } else {
        return this.generateLocalSuggestions(torrentName);
      }
    } catch (error) {
      return this.generateLocalSuggestions(torrentName);
    }
  }

  /**
   * Local fallback for generating search suggestions
   */
  private generateLocalSuggestions(torrentName: string): string[] {
    const cleaned = this.cleanQuery(torrentName);
    const suggestions = [cleaned];

    const words = cleaned.split(' ').filter((word) => word.length > 0);

    if (words.length >= 2) {
      if (words.length >= 2) {
        suggestions.push(words.slice(0, 2).join(' '));
      }

      if (words.length >= 3) {
        suggestions.push(`${words[0]} ${words.slice(1, 3).join(' ')}`);
        suggestions.push(words.slice(-2).join(' '));
      }

      if (words.length >= 2) {
        suggestions.push(words[1]);
        if (words.length >= 3) {
          suggestions.push(words[2]);
        }
      }
    }

    suggestions.push(`${cleaned} photo`);
    suggestions.push(`${cleaned} image`);
    suggestions.push(`${cleaned} gallery`);

    return Array.from(new Set(suggestions.filter((s) => s.length > 0)));
  }
}

export const googleImagesService = new GoogleImagesService();

// Development helpers
if (process.env.NODE_ENV === 'development') {
  (window as any).googleImagesService = {
    search: (query: string, limit?: number) =>
      googleImagesService.searchImages(query, limit),
    suggestions: (name: string) =>
      googleImagesService.generateSearchSuggestions(name),
  };
}
