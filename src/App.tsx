import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container, Paper, Box, Typography } from '@mui/material';
import SearchForm, { SearchFormRef } from './components/SearchForm';
import TorrentResults from './components/TorrentResults';
import FavoritesPage from './components/FavoritesPage';
import StoredLinksPage from './components/StoredLinksPage';
import LinkCachingComponent from './components/LinkCachingComponent';
import IncognitoModeNotification from './components/IncognitoModeNotification';
import CoverImageMigrationDialog from './components/CoverImageMigrationDialog';
import Header from './components/Header';
import ErrorAlert from './components/ErrorAlert';
import LoginPage from './components/auth/LoginPage';
import AccountPage from './components/account/AccountPage';
import AuthRequired from './components/auth/AuthRequired';
import { AuthProvider } from './contexts/AuthContext';
import { Torrent } from './types/Torrent';
import { darkTheme } from './theme/theme';
import { coverImageService } from './services/enhancedCoverImageService';
import { torrentApi } from './services/torrentApi';
import { isSearchPresetToken } from './data/commonSearchPresets';
import { buildCombinedSearchQuery } from './utils/searchQuery';
import './App.css';
import './styles/android.css';

// Component to handle search page logic
const SearchPage: React.FC = () => {
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const activeQuery = urlSearchParams.get('q')?.trim() || '';
  const presetParam = urlSearchParams.get('preset');
  const filterParam = (urlSearchParams.get('filter') || '').trim();
  const qualityParam = (urlSearchParams.get('quality') || '').trim();

  /** True default home: no query, preset, studio filter, or quality in URL */
  const isBrowseHome =
    !activeQuery &&
    !isSearchPresetToken(presetParam) &&
    !filterParam &&
    !qualityParam;
  /** ?preset=xxx|trans with empty search box */
  const isPresetHome =
    !activeQuery && isSearchPresetToken(presetParam);
  /** Studio / quality only (no q/preset) — must search, not browse */
  const isStudioOrQualityUrlSearch =
    !activeQuery &&
    !isSearchPresetToken(presetParam) &&
    (!!filterParam || !!qualityParam);
  const homePreset = isSearchPresetToken(presetParam) ? presetParam : null;
  /** Pagination handled by URL effects, not SearchForm ref */
  const isUrlDrivenPagination =
    isBrowseHome || isPresetHome || isStudioOrQualityUrlSearch;

  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loading, setLoading] = useState(isUrlDrivenPagination);
  const [error, setError] = useState<string | null>(null);
  const currentPage = parseInt(urlSearchParams.get('page') || '1', 10) || 1;
  const [searchParams, setSearchParams] = useState<{
    query: string;
    website: string;
    quality: string;
    customFilter: string;
    minSeeders: number;
  } | null>(null);
  const searchFormRef = useRef<SearchFormRef>(null);

  // When true, SearchForm is running a search — URL effects should not duplicate it
  const searchFormActiveRef = useRef(false);

  const websiteParam = urlSearchParams.get('website') || 'piratebay';
  const minSeedersParam = Number(urlSearchParams.get('minSeeders')) || 1;
  const sortParam = urlSearchParams.get('sort');
  const categoryParam = urlSearchParams.get('category');

  useEffect(() => {
    if (!isBrowseHome) return;
    if (searchFormActiveRef.current) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSearchParams(null);
      try {
        const results = await torrentApi.browseTorrents('507', currentPage, '3');
        if (!cancelled) setTorrents(results || []);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Browse error:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load latest torrents'
          );
          setTorrents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isBrowseHome, currentPage]);

  useEffect(() => {
    if (!isPresetHome) return;
    if (searchFormActiveRef.current) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const website = websiteParam;
      const quality = qualityParam;
      const customFilter = filterParam;
      const minSeeders = minSeedersParam;

      let sort: string | undefined;
      let category: string | undefined;
      if (website === 'piratebay') {
        sort = sortParam || '7';
        category = categoryParam || '507';
      } else if (website === '1337x') {
        sort = sortParam || 'seeders';
        category = categoryParam || 'XXX';
      }

      const combined = buildCombinedSearchQuery(
        presetParam,
        quality,
        customFilter
      );

      setSearchParams({
        query: presetParam!,
        website,
        quality,
        customFilter,
        minSeeders,
      });

      try {
        const results = await torrentApi.searchTorrents(
          combined,
          website,
          currentPage,
          minSeeders,
          true,
          sort,
          category
        );
        if (!cancelled) setTorrents(results || []);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Home preset search error:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load torrents'
          );
          setTorrents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isPresetHome,
    presetParam,
    currentPage,
    websiteParam,
    qualityParam,
    filterParam,
    minSeedersParam,
    sortParam,
    categoryParam,
  ]);

  useEffect(() => {
    if (!isStudioOrQualityUrlSearch) return;
    if (searchFormActiveRef.current) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const website = websiteParam;
      const minSeeders = minSeedersParam;

      let sort: string | undefined;
      let category: string | undefined;
      if (website === 'piratebay') {
        sort = sortParam || '7';
        category = categoryParam || '507';
      } else if (website === '1337x') {
        sort = sortParam || 'seeders';
        category = categoryParam || 'XXX';
      }

      setSearchParams({
        query: '',
        website,
        quality: qualityParam,
        customFilter: filterParam,
        minSeeders,
      });

      const combined = buildCombinedSearchQuery('', qualityParam, filterParam);

      try {
        const results = await torrentApi.searchTorrents(
          combined,
          website,
          currentPage,
          minSeeders,
          true,
          sort,
          category
        );
        if (!cancelled) setTorrents(results || []);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Studio/quality URL search error:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load torrents'
          );
          setTorrents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isStudioOrQualityUrlSearch,
    currentPage,
    websiteParam,
    qualityParam,
    filterParam,
    minSeedersParam,
    sortParam,
    categoryParam,
  ]);

  const setCurrentPage = (page: number) => {
    setUrlSearchParams(prev => {
      // Preserve all existing params — only update the page number
      const next = new URLSearchParams(prev);
      if (page > 1) {
        next.set('page', String(page));
      } else {
        next.delete('page');
      }
      return next;
    }, { replace: true });
  };

  const handleSearch = (torrents: Torrent[], page: number) => {
    searchFormActiveRef.current = false;
    setTorrents(torrents);
    setCurrentPage(page);
  };

  const handleLoading = (isLoading: boolean) => {
    if (isLoading) {
      searchFormActiveRef.current = true;
    }
    setLoading(isLoading);
  };

  const handleError = (error: string | null) => {
    searchFormActiveRef.current = false;
    setError(error);
  };

  const handleSearchParamsChange = (
    query: string,
    website: string,
    quality: string,
    customFilter: string,
    minSeeders: number
  ) => {
    setSearchParams({ query, website, quality, customFilter, minSeeders });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (isUrlDrivenPagination) return;
    if (searchFormRef.current) {
      searchFormRef.current.searchWithCurrentParams(page);
    } else {
      console.warn('Cannot paginate: missing search form ref');
    }
  };

  return (
    <Container maxWidth='lg' sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <SearchForm
          ref={searchFormRef}
          onSearch={handleSearch}
          onLoading={handleLoading}
          onError={handleError}
          currentPage={currentPage}
          onSearchParamsChange={handleSearchParamsChange}
        />
      </Paper>

      <LinkCachingComponent />

      {error && <ErrorAlert error={error} />}

      {isBrowseHome && (
        <Box sx={{ mb: 3 }}>
          <Typography variant='h4' component='h2' align='center' gutterBottom>
            Latest Uploads
          </Typography>
          <Typography variant='body2' align='center' sx={{ opacity: 0.7 }}>
            UHD/4K Porn (browse), newest first. Common search &quot;xxx&quot; / &quot;trans&quot; uses a keyword search instead.
          </Typography>
        </Box>
      )}

      {isPresetHome && homePreset && (
        <Box sx={{ mb: 3 }}>
          <Typography variant='h4' component='h2' align='center' gutterBottom>
            Home
          </Typography>
          <Typography variant='body2' align='center' sx={{ opacity: 0.7 }}>
            Keyword preset &quot;{homePreset}&quot;. Choose &quot;Latest uploads (browse)&quot; for default home.
          </Typography>
        </Box>
      )}

      <TorrentResults
        torrents={torrents}
        loading={loading}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        searchParams={isBrowseHome ? null : searchParams}
        browseMode={isBrowseHome}
      />
    </Container>
  );
};

// Main App content component that uses navigation
const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [coverCountToMigrate, setCoverCountToMigrate] = useState(0);

  // Check for localStorage covers to migrate on mount
  useEffect(() => {
    const MIGRATION_DISMISSED_KEY = 'cover-migration-dismissed';
    const dismissed = localStorage.getItem(MIGRATION_DISMISSED_KEY);

    if (!dismissed && coverImageService.hasLocalStorageCoversToMigrate()) {
      const count = coverImageService.getLocalStorageCoverCount();
      setCoverCountToMigrate(count);
      setShowMigrationDialog(true);
    }
  }, []);

  const handleCloseMigrationDialog = () => {
    setShowMigrationDialog(false);
    // Mark migration as dismissed so we don't show it again
    const MIGRATION_DISMISSED_KEY = 'cover-migration-dismissed';
    localStorage.setItem(MIGRATION_DISMISSED_KEY, 'true');
  };

  // Determine current view based on route
  const getCurrentView = (): 'home' | 'search' | 'favorites' | 'cached-links' => {
    const path = location.pathname;
    if (path === '/favorites') return 'favorites';
    if (path === '/cached-links') return 'cached-links';
    if (
      path === '/' &&
      !urlSearchParams.get('q')?.trim() &&
      !urlSearchParams.get('filter')?.trim() &&
      !urlSearchParams.get('quality')?.trim()
    ) {
      return 'home';
    }
    return 'search';
  };

  const handleViewChange = (view: 'home' | 'search' | 'favorites' | 'cached-links') => {
    if (view === 'home') {
      navigate({ pathname: '/', search: '' });
      return;
    }
    const routes = {
      search: '/',
      favorites: '/favorites',
      'cached-links': '/cached-links'
    };
    navigate(routes[view]);
  };

  return (
    <div className='App'>
      <Header currentView={getCurrentView()} onViewChange={handleViewChange} />
      <IncognitoModeNotification />

      {/* Cover Image Migration Dialog */}
      <CoverImageMigrationDialog
        open={showMigrationDialog}
        onClose={handleCloseMigrationDialog}
        coverCount={coverCountToMigrate}
      />

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthRequired>
              <SearchPage />
            </AuthRequired>
          }
        />
        <Route
          path="/account"
          element={
            <AuthRequired>
              <AccountPage />
            </AuthRequired>
          }
        />
        <Route
          path="/favorites"
          element={
            <AuthRequired>
              <FavoritesPage onBack={() => navigate('/')} />
            </AuthRequired>
          }
        />
        <Route
          path="/stored-links"
          element={
            <AuthRequired>
              <StoredLinksPage onBack={() => navigate('/')} />
            </AuthRequired>
          }
        />
        {/* Legacy route for backward compatibility */}
        <Route
          path="/cached-links"
          element={
            <AuthRequired>
              <StoredLinksPage onBack={() => navigate('/')} />
            </AuthRequired>
          }
        />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
