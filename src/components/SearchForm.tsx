import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Torrent } from '../types/Torrent';
import { torrentApi } from '../services/torrentApi';
import SearchInput from './search/SearchInput';
import CommonSearchPresetSelector from './search/CommonSearchPresetSelector';
import WebsiteSelector from './search/WebsiteSelector';
import StudioCategorySelector from './search/StudioCategorySelector';
import CustomFilterSelector from './search/CustomFilterSelector';
import {
  StudioCategoryOrAll,
  STUDIO_CATEGORY_ORDER,
  studiosForCategory,
} from '../data/studioCategories';
import MinimumSeedersSelector from './search/MinimumSeedersSelector';
import PiratebayOptionsSelector from './search/PiratebayOptionsSelector';
import X1337xOptionsSelector from './search/X1337xOptionsSelector';
import SearchButton from './search/SearchButton';
import {
  CommonSearchMode,
  isSearchPresetToken,
} from '../data/commonSearchPresets';
import { buildCombinedSearchQuery } from '../utils/searchQuery';

interface SearchFormProps {
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

export interface SearchFormRef {
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

const SearchForm = forwardRef<SearchFormRef, SearchFormProps>(
  (
    { onSearch, onLoading, onError, currentPage = 1, onSearchParamsChange },
    ref
  ) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const presetParam = searchParams.get('preset');
    const initialMode: CommonSearchMode = isSearchPresetToken(presetParam)
      ? presetParam
      : 'browse';

    // Home: empty search box + browse (latest) unless ?preset=xxx|trans is explicit
    const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
    const [commonPreset, setCommonPreset] =
      useState<CommonSearchMode>(initialMode);
    const [website, setWebsite] = useState(searchParams.get('website') || 'piratebay');
    const [quality, setQuality] = useState(searchParams.get('quality') || '');
    const [customFilter, setCustomFilter] = useState(searchParams.get('filter') || '');
    const [studioCategory, setStudioCategory] = useState<StudioCategoryOrAll>(
      () => {
        const c = searchParams.get('studioCat');
        return (STUDIO_CATEGORY_ORDER as string[]).includes(c || '')
          ? (c as StudioCategoryOrAll)
          : 'all';
      }
    );
    const [minSeeders, setMinSeeders] = useState(Number(searchParams.get('minSeeders')) || 1);
    const [availableWebsites, setAvailableWebsites] = useState<string[]>([]);
    const [piratebaySort, setPiratebaySort] = useState(searchParams.get('sort') || '7');
    const [piratebayCategory, setPiratebayCategory] = useState(searchParams.get('category') || '507');
    const [x1337xSort, setX1337xSort] = useState(searchParams.get('sort') || 'seeders');
    const [x1337xCategory, setX1337xCategory] = useState(searchParams.get('category') || 'XXX');
    const [initialSearchDone, setInitialSearchDone] = useState(false);

    useEffect(() => {
      // Fetch available torrent websites
      const fetchWebsites = async () => {
        const websites = await torrentApi.getAvailableWebsites();
        setAvailableWebsites(websites);
      };

      fetchWebsites();
    }, []);

    const urlQ = searchParams.get('q');
    useEffect(() => {
      setQuery(urlQ ?? '');
    }, [urlQ]);

    const urlFilter = searchParams.get('filter');
    useEffect(() => {
      setCustomFilter(urlFilter ?? '');
    }, [urlFilter]);

    const urlQuality = searchParams.get('quality');
    useEffect(() => {
      setQuality(urlQuality ?? '');
    }, [urlQuality]);

    const urlPreset = searchParams.get('preset');
    useEffect(() => {
      setCommonPreset(
        isSearchPresetToken(urlPreset) ? urlPreset : 'browse'
      );
    }, [urlPreset]);

    const urlStudioCat = searchParams.get('studioCat');
    useEffect(() => {
      setStudioCategory(
        (STUDIO_CATEGORY_ORDER as string[]).includes(urlStudioCat || '')
          ? (urlStudioCat as StudioCategoryOrAll)
          : 'all'
      );
    }, [urlStudioCat]);

    /** Typed query, else explicit preset token only (never "browse") */
    const effectiveBaseQuery = () => {
      const t = query.trim();
      if (t) return t;
      if (commonPreset === 'browse') return '';
      return commonPreset;
    };

    // Auto-search on mount if URL has an explicit search query
    useEffect(() => {
      const urlQuery = searchParams.get('q')?.trim();
      if (urlQuery && !initialSearchDone) {
        setInitialSearchDone(true);
        performSearch(
          urlQuery,
          website,
          1,
          quality,
          customFilter,
          minSeeders
        );
      }
    }, [initialSearchDone]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      performSearch,
      getCurrentParams: () => ({
        query: effectiveBaseQuery(),
        website,
        quality,
        customFilter,
        minSeeders,
      }),
      searchWithCurrentParams: async (page: number) => {
        await performSearch(
          effectiveBaseQuery(),
          website,
          page,
          quality,
          customFilter,
          minSeeders
        );
      },
    }));

    const buildSearchQuery = buildCombinedSearchQuery;

    // Expose search function to parent components
    const performSearch = async (
      searchQuery: string,
      searchWebsite: string,
      page: number = 1,
      qualityFilter: string = '',
      customFilterValue: string = '',
      minSeedersValue: number = 0
    ) => {

      onLoading(true);
      onError(null);

      try {
        // Combine the base query with filters
        const combinedQuery = buildSearchQuery(
          searchQuery,
          qualityFilter,
          customFilterValue
        );

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

        const torrents = await torrentApi.searchTorrents(
          combinedQuery,
          searchWebsite,
          page,
          minSeedersValue,
          true, // Enable cover images
          sort,
          category
        );

        onSearch(torrents, page);
      } catch (error: any) {
        console.error('Search error:', error);
        onError(
          error.message || 'Failed to search torrents. Please try again.'
        );
        onSearch([], page);
      } finally {
        onLoading(false);
      }
    };

    const appendOptionParams = (params: Record<string, string>) => {
      if (website !== 'piratebay') params.website = website;
      if (quality) params.quality = quality;
      if (customFilter) params.filter = customFilter;
      if (studioCategory !== 'all') params.studioCat = studioCategory;
      if (minSeeders !== 1) params.minSeeders = String(minSeeders);
      if (website === 'piratebay') {
        if (piratebaySort !== '7') params.sort = piratebaySort;
        if (piratebayCategory !== '507') params.category = piratebayCategory;
      } else if (website === '1337x') {
        if (x1337xSort !== 'seeders') params.sort = x1337xSort;
        if (x1337xCategory) params.category = x1337xCategory;
      }
    };

    const handleSearch = async () => {
      const base = effectiveBaseQuery();
      const hasModifiers = !!(quality.trim() || customFilter.trim());
      const params: Record<string, string> = {};
      if (query.trim()) {
        params.q = query.trim();
      } else if (commonPreset !== 'browse') {
        params.preset = commonPreset;
      }
      appendOptionParams(params);

      if (!base && !hasModifiers) {
        setSearchParams(params);
        return;
      }

      setSearchParams(params);

      // Preset / studio / quality searches are driven by URL params in App.tsx.
      // Running performSearch here too caused duplicate requests and URL races
      // that dropped ?filter= and reverted to browse home.
      if (!query.trim()) {
        return;
      }

      await performSearch(base, website, 1, quality, customFilter, minSeeders);

      if (onSearchParamsChange) {
        onSearchParamsChange(base, website, quality, customFilter, minSeeders);
      }
    };

    const handleStudioCategoryChange = (category: StudioCategoryOrAll) => {
      setStudioCategory(category);
      // Clear the selected studio when it isn't part of the new category.
      if (customFilter && !studiosForCategory(category).includes(customFilter)) {
        setCustomFilter('');
      }
    };

    const handleCommonPresetChange = (mode: CommonSearchMode) => {
      setCommonPreset(mode);
      const params: Record<string, string> = {};
      if (mode !== 'browse') {
        params.preset = mode;
      }
      if (query.trim()) {
        params.q = query.trim();
      }
      appendOptionParams(params);
      setSearchParams(params);
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleSearch();
      }
    };

    return (
      <Box>
        <Typography
          variant='h4'
          component='h1'
          gutterBottom
          align='center'
          sx={{ mb: 3 }}>
          Search Torrents
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <SearchInput
              query={query}
              onChange={setQuery}
              onKeyPress={handleKeyPress}
            />

            <CommonSearchPresetSelector
              value={commonPreset}
              onChange={handleCommonPresetChange}
            />

            <WebsiteSelector
              website={website}
              availableWebsites={availableWebsites}
              onChange={setWebsite}
            />

            <MinimumSeedersSelector
              minSeeders={minSeeders}
              onChange={setMinSeeders}
            />

            <StudioCategorySelector
              value={studioCategory}
              onChange={handleStudioCategoryChange}
            />

            <CustomFilterSelector
              filter={customFilter}
              onChange={setCustomFilter}
              category={studioCategory}
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

            <SearchButton onClick={handleSearch} />
          </Box>
        </Box>
      </Box>
    );
  }
);

SearchForm.displayName = 'SearchForm';

export default SearchForm;
