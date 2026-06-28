import { StoredLink } from './storedLinksService';
import androidApiConfig from './androidApiConfig';

export interface StoredLinksApiResponse {
  success: boolean;
  storedLinks?: StoredLink[];
  storedLink?: StoredLink;
  message?: string;
  error?: string;
}

class StoredLinksApi {
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    return androidApiConfig.makeBackendRequest(endpoint, options);
  }

  async getStoredLinks(): Promise<StoredLink[]> {
    try {
      const response: StoredLinksApiResponse = await this.makeRequest(
        '/api/storage/stored-links'
      );

      if (response.success && response.storedLinks) {
        return response.storedLinks;
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  async addStoredLink(url: string, title?: string): Promise<StoredLink | null> {
    try {
      const response: StoredLinksApiResponse = await this.makeRequest(
        '/api/storage/stored-links',
        {
          method: 'POST',
          body: JSON.stringify({ url, title }),
        }
      );

      if (response.success && response.storedLink) {
        return response.storedLink;
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  async removeStoredLink(id: string): Promise<boolean> {
    try {
      const response: StoredLinksApiResponse = await this.makeRequest(
        `/api/storage/stored-links/${id}`,
        {
          method: 'DELETE',
        }
      );

      return response.success;
    } catch (error) {
      return false;
    }
  }

  async updateStoredLink(
    id: string,
    updates: Partial<StoredLink>
  ): Promise<boolean> {
    try {
      const response: StoredLinksApiResponse = await this.makeRequest(
        `/api/storage/stored-links/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );

      return response.success;
    } catch (error) {
      return false;
    }
  }
}

export const storedLinksApi = new StoredLinksApi();
