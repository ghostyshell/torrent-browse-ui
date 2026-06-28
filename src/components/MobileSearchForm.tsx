/**
 * Mobile-Optimized Search Form
 * Touch-friendly search interface for Android WebView
 */

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { Torrent } from '../types/Torrent';
import { torrentApi } from '../services/torrentApi';
import useMobileOptimizations from '../hooks/useMobileOptimizations';
import SearchInput from './search/SearchInput';
import WebsiteSelector from './search/WebsiteSelector';
import VideoQualitySelector from './search/VideoQualitySelector';
import CustomFilterSelector from './search/CustomFilterSelector';
import MinimumSeedersSelector from './search/MinimumSeedersSelector';
import PiratebayOptionsSelector from './search/PiratebayOptionsSelector';
import X1337xOptionsSelector from './search/X1337xOptionsSelector';
import SearchButton from './search/SearchButton';
import '../styles/android.css';

interface MobileSearchFormProps {
  onSearch: (torrents: Torrent[], currentPage: number) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
  currentPage?: number;
  onSearchParamsChange?: (
    query: string,
    website: string,
    quality: string,
    customFilter: string,
    minSeeders: number
  ) => void;
}

export interface MobileSearchFormRef {
  performSearch: (
    query: string,
    website: string,
    page: number,
    quality?: string,
    customFilter?: string,
    minSeeders?: number
  ) => Promise<void>;
  getCurrentParams: () => {
    query: string;
    website: string;
    quality: string;
    customFilter: string;
    minSeeders: number;
  };
  searchWithCurrentParams: (page: number) => Promise<void>;
}

const MobileSearchForm = forwardRef<MobileSearchFormRef, MobileSearchFormProps>(
  (
    { onSearch, onLoading, onError, currentPage = 1, onSearchParamsChange },
    ref
  ) => {
    // Default search replicates: https://1337x.to/category-search/2160p/XXX/1/
    const [query, setQuery] = useState('2160p');
    const [website, setWebsite] = useState('1337x');
    const [quality, setQuality] = useState('');
    const [customFilter, setCustomFilter] = useState('');
    const [minSeeders, setMinSeeders] = useState(1);
    const [availableWebsites, setAvailableWebsites] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [piratebaySort, setPiratebaySort] = useState('7');
    const [piratebayCategory, setPiratebayCategory] = useState('507');
    const [x1337xSort, setX1337xSort] = useState('seeders');
    const [x1337xCategory, setX1337xCategory] = useState('XXX');

    const {
      isMobile,
      isAndroidWebView,
      touchOptimizations,
      networkStatus,
      viewport,
    } = useMobileOptimizations();

    // Load available websites on component mount
    useEffect(() => {
      const loadWebsites = async () => {
        try {
          const websites = await torrentApi.getAvailableWebsites();
          setAvailableWebsites(websites);
        } catch (error) {
          console.error('Failed to load available websites:', error);
          setAvailableWebsites([
            'all',
            'piratebay',
            'yts',
            'nyaasi',
            'limetorrent',
          ]);
        }
      };

      loadWebsites();
    }, []);

    // Notify parent of search parameter changes
    useEffect(() => {
      if (onSearchParamsChange) {
        onSearchParamsChange(query, website, quality, customFilter, minSeeders);
      }
    }, [
      query,
      website,
      quality,
      customFilter,
      minSeeders,
      onSearchParamsChange,
    ]);

    const performSearch = async (
      searchQuery: string,
      searchWebsite: string,
      page: number,
      searchQuality?: string,
      searchCustomFilter?: string,
      searchMinSeeders?: number
    ) => {
      if (!searchQuery.trim()) {
        onError('Please enter a search query');
        return;
      }

      if (!networkStatus.isOnline) {
        onError(
          'No internet connection. Please check your network and try again.'
        );
        return;
      }

      setIsLoading(true);
      onLoading(true);
      onError(null);

      try {
        // Apply quality filter to query if specified
        let finalQuery = searchQuery.trim();
        if (searchQuality) {
          finalQuery = `${finalQuery} ${searchQuality}`;
        }

        // Apply custom filter to query if specified
        if (searchCustomFilter) {
          finalQuery = `${finalQuery} ${searchCustomFilter}`;
        }

        // Pass website-specific options
        let sort: string | undefined;
        let category: string | undefined;

        if (searchWebsite === 'piratebay') {
          sort = piratebaySort;
          category = piratebayCategory;
        } else if (searchWebsite === '1337x') {
          sort = x1337xSort;
          category = x1337xCategory || undefined;
        }

        const results = await torrentApi.searchTorrents(
          finalQuery,
          searchWebsite,
          page,
          searchMinSeeders || undefined,
          true, // includeCoverImages
          sort,
          category
        );

        onSearch(results, page);
      } catch (error: any) {
        console.error('Search failed:', error);
        onError(error.message || 'Search failed. Please try again.');
      } finally {
        setIsLoading(false);
        onLoading(false);
      }
    };

    const handleSearch = () => {
      performSearch(
        query,
        website,
        currentPage,
        quality,
        customFilter,
        minSeeders
      );
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleSearch();
      }
    };

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      performSearch,
      getCurrentParams: () => ({
        query,
        website,
        quality,
        customFilter,
        minSeeders,
      }),
      searchWithCurrentParams: (page: number) =>
        performSearch(query, website, page, quality, customFilter, minSeeders),
    }));

    const containerClass = isAndroidWebView
      ? 'mobile-search-form android-webview'
      : 'mobile-search-form';

    return (
      <Box className={containerClass}>
        {/* Network Status Indicator */}
        {!networkStatus.isOnline && (
          <Box className='mobile-error'>
            <Typography variant='body2'>
              No internet connection. Please check your network settings.
            </Typography>
          </Box>
        )}

        {/* Main Search Input */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <SearchInput
              value={query}
              onChange={setQuery}
              onKeyPress={handleKeyPress}
              disabled={isLoading || !networkStatus.isOnline}
              className={touchOptimizations ? 'mobile-input' : ''}
            />
          </Box>
          <SearchButton
            onClick={handleSearch}
            loading={isLoading}
            disabled={!query.trim() || !networkStatus.isOnline}
            className={touchOptimizations ? 'touch-button' : ''}
          />
        </Box>

        {/* Website Selector - Always visible on mobile */}
        <Box sx={{ width: '100%' }}>
          <WebsiteSelector
            value={website}
            onChange={setWebsite}
            websites={availableWebsites}
            disabled={isLoading}
            className={touchOptimizations ? 'mobile-select' : ''}
          />
        </Box>

        {/* Advanced Options Toggle */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <IconButton
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={touchOptimizations ? 'touch-button' : ''}
            sx={{
              minHeight: touchOptimizations ? 44 : 'auto',
              minWidth: touchOptimizations ? 44 : 'auto',
            }}>
            {showAdvanced ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          <Typography variant='body2' color='textSecondary'>
            Advanced Options
          </Typography>
        </Box>

        {/* Advanced Options */}
        <Collapse in={showAdvanced}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <VideoQualitySelector
              value={quality}
              onChange={setQuality}
              disabled={isLoading}
              className={touchOptimizations ? 'mobile-select' : ''}
            />

            <CustomFilterSelector
              value={customFilter}
              onChange={setCustomFilter}
              disabled={isLoading}
              className={touchOptimizations ? 'mobile-select' : ''}
            />

            <MinimumSeedersSelector
              value={minSeeders}
              onChange={setMinSeeders}
              disabled={isLoading}
              className={touchOptimizations ? 'mobile-input' : ''}
            />

            {website === 'piratebay' && (
              <PiratebayOptionsSelector
                sort={piratebaySort}
                category={piratebayCategory}
                onSortChange={setPiratebaySort}
                onCategoryChange={setPiratebayCategory}
              />
            )}

            {website === '1337x' && (
              <X1337xOptionsSelector
                sort={x1337xSort}
                category={x1337xCategory}
                onSortChange={setX1337xSort}
                onCategoryChange={setX1337xCategory}
              />
            )}
          </Box>
        </Collapse>

        {/* Loading Indicator */}
        {isLoading && (
          <Box className='mobile-loading'>
            <div className='mobile-loading-spinner' />
            <Typography variant='body2' color='textSecondary'>
              Searching torrents...
            </Typography>
          </Box>
        )}
      </Box>
    );
  }
);

MobileSearchForm.displayName = 'MobileSearchForm';

export default MobileSearchForm;
