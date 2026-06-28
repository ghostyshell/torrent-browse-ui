export interface CoverImage {
  type: 'url' | 'blob';
  url?: string;
  mimeType?: string;
  fallbackUrls?: string[];
  tpdbUrl?: string;    // TPDB/StashDB cover (preferred for addon, fallback for UI)
  detailsUrl?: string; // description/NFO scrape cover (lowest priority fallback)
}

export interface Torrent {
  Name: string;
  Size: string;
  DateUploaded: string;
  Category: string;
  Seeders: string;
  Leechers: string;
  UploadedBy: string;
  Url: string;
  Magnet: string;
  Source?: string; // For combo results
  coverImage?: CoverImage; // Cover image data from backend
  // Optional fields for cached links converted to torrents
  isCachedLink?: boolean;
  cachedLinkId?: string;
}
