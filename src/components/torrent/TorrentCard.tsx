import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  CardMedia,
  CardActionArea,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as VisibilityIcon,
  PlayCircle as PlayCircleIcon,
  CloudDownload as CloudDownloadIcon,
  Cached as CachedIcon,
  Refresh as RefreshIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Inventory2 as Inventory2Icon,
  CalendarMonth as CalendarMonthIcon,
} from '@mui/icons-material';
import { Torrent } from '../../types/Torrent';
import { getCategoryIcon } from '../../utils/categoryUtils';
import { formatSize, formatDate } from '../../utils/torrentUtils';
import { coverImageService } from '../../services/enhancedCoverImageService';
import { realDebridService } from '../../services/realDebridService';
import { useCacheStatus } from '../../hooks/useCacheStatus';
import { favoritesService } from '../../services/favoritesService';
import { magnetCacheService } from '../../utils/magnetCache';
import TorrentHealth from './TorrentHealth';

interface TorrentCardProps {
  torrent: Torrent;
  onClick: (torrent: Torrent) => void;
  onDirectPlay?: (torrent: Torrent) => void;
  onCacheAndPlay?: (torrent: Torrent) => void;
  cacheRefreshTrigger?: any; // Trigger to force cache status refresh
  // When true, the card relies solely on the cover supplied inline via
  // torrent.coverImage and skips the per-card backend fallback fetch + periodic
  // re-check. Used on the favorites page, where the list response already
  // resolves covers authoritatively, to avoid redundant requests.
  disableCoverFallback?: boolean;
}

const TorrentCard: React.FC<TorrentCardProps> = ({
  torrent,
  onClick,
  onDirectPlay,
  onCacheAndPlay,
  cacheRefreshTrigger,
  disableCoverFallback = false,
}) => {
  // State for favorites and cover images
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentCoverImage, setCurrentCoverImage] = useState<string | null>(
    null
  );
  const [coverFallbackUrls, setCoverFallbackUrls] = useState<string[]>([]);
  const [coverFallbackIndex, setCoverFallbackIndex] = useState(0);
  // Guards the lazy per-card re-resolve so it fires once per mount, not on every
  // onError ripple (avoids a retry loop if the re-resolved URL also fails).
  const coverResolveAttempted = useRef(false);
  // State for cached magnet (for sources like 1337x that don't include magnet in search)
  const [cachedMagnet, setCachedMagnet] = useState<string | null>(() => {
    if (torrent.Magnet) return null; // Already has magnet
    // Check memory cache first (synchronous)
    return magnetCacheService.get(torrent.Source || '', torrent.Url);
  });

  // On mount, check backend for cached magnet if not in memory
  useEffect(() => {
    if (torrent.Magnet || cachedMagnet) return; // Already have magnet
    if (!torrent.Source || !torrent.Url) return; // Need these to check

    // Async check backend cache
    const checkBackendCache = async () => {
      const backendMagnet = await magnetCacheService.getAsync(
        torrent.Source!,
        torrent.Url
      );
      if (backendMagnet) {
        setCachedMagnet(backendMagnet);
      }
    };

    checkBackendCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torrent.Magnet, torrent.Source, torrent.Url]); // Don't include cachedMagnet to avoid re-running after it's set

  // Effective magnet is either from torrent or from cache
  const effectiveMagnet = torrent.Magnet || cachedMagnet;

  // Debug log when effectiveMagnet changes
  useEffect(() => {
    if (torrent.Source?.toLowerCase() === '1337x') {
      console.log('🧲 [TorrentCard] Effective magnet changed:', {
        name: torrent.Name?.substring(0, 50),
        hasTorrentMagnet: !!torrent.Magnet,
        hasCachedMagnet: !!cachedMagnet,
        hasEffectiveMagnet: !!effectiveMagnet,
        magnetPreview: effectiveMagnet?.substring(0, 50)
      });
    }
  }, [effectiveMagnet, torrent.Magnet, cachedMagnet, torrent.Source, torrent.Name]);

  // Use the cache status hook for reactive updates
  const { hasCachedStreamUrl, isStreamUrlExpired } = useCacheStatus(
    effectiveMagnet ?? undefined,
    cacheRefreshTrigger
  );

  // Listen for magnet cache updates
  useEffect(() => {
    const handleMagnetCached = (event: CustomEvent<{ source: string; url: string; magnet: string }>) => {
      const { source, url, magnet } = event.detail;
      console.log('🎯 [TorrentCard] Magnet cached event:', {
        eventSource: source,
        eventUrl: url.substring(0, 50),
        cardSource: torrent.Source,
        cardUrl: torrent.Url.substring(0, 50),
        cardName: torrent.Name?.substring(0, 50),
        matches: source.toLowerCase() === torrent.Source?.toLowerCase() && url === torrent.Url
      });
      if (
        source.toLowerCase() === torrent.Source?.toLowerCase() &&
        url === torrent.Url
      ) {
        console.log('✅ [TorrentCard] Updating cached magnet for:', torrent.Name?.substring(0, 50));
        setCachedMagnet(magnet);
      }
    };

    window.addEventListener('magnet-cached', handleMagnetCached as EventListener);
    return () => {
      window.removeEventListener('magnet-cached', handleMagnetCached as EventListener);
    };
  }, [torrent.Source, torrent.Url, torrent.Name]);

  // Check favorite status on component mount and when torrent changes
  useEffect(() => {
    // If this is a FavoriteTorrent (has dateAdded property), it's definitely a favorite
    if ('dateAdded' in torrent) {
      setIsFavorite(true);
    } else {
      // Check if this torrent is in favorites using the service
      const isFav = favoritesService.isFavoriteSync(torrent);
      setIsFavorite(isFav);
    }
  }, [torrent]);

  // Listen for localStorage changes to update favorite status
  useEffect(() => {
    const handleStorageChange = () => {
      if (!('dateAdded' in torrent)) {
        const isFav = favoritesService.isFavoriteSync(torrent);
        setIsFavorite(isFav);
      }
    };

    // Listen for localStorage changes
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event when localStorage is updated from the same tab
    window.addEventListener('favorites-updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('favorites-updated', handleStorageChange);
    };
  }, [torrent]);

  // Load cover image from backend-first storage
  useEffect(() => {
    const loadCoverImage = async () => {
      // First try the torrent's built-in cover image from search results.
      // Fall through tpdbUrl then detailsUrl when the primary url is absent.
      const inlineUrl = torrent.coverImage?.url
        || torrent.coverImage?.tpdbUrl
        || torrent.coverImage?.detailsUrl;
      if (inlineUrl) {
        setCurrentCoverImage(inlineUrl);
        setCoverFallbackUrls(torrent.coverImage?.fallbackUrls || []);
        setCoverFallbackIndex(0);
        return;
      }

      // When the inline cover is authoritative (favorites page), don't fall back
      // to a per-card backend lookup — there is no cover to find.
      if (disableCoverFallback) {
        return;
      }

      // Then check our backend-first cover image service (S3 object storage)
      const existingCover = await coverImageService.getCoverImageAsync(torrent);
      if (existingCover) {
        const fallbacks = await coverImageService.getFallbackUrlsAsync(torrent);
        setCurrentCoverImage(existingCover);
        setCoverFallbackUrls(fallbacks);
        setCoverFallbackIndex(0);
      }
    };
    loadCoverImage();

    // Periodic re-check for covers added via universal sync. Skipped when the
    // inline cover is authoritative, since the fallback fetch is disabled.
    if (disableCoverFallback) {
      return;
    }
    const COVER_IMAGE_SYNC_INTERVAL = 30000; // Check every 30 seconds
    const hasInlineCover = !!(torrent.coverImage?.url || torrent.coverImage?.tpdbUrl || torrent.coverImage?.detailsUrl);
    const interval = setInterval(async () => {
      if (!hasInlineCover) {
        const existingCover = await coverImageService.getCoverImageAsync(torrent);
        if (existingCover && existingCover !== currentCoverImage) {
          setCurrentCoverImage(existingCover);
        }
      }
    }, COVER_IMAGE_SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [torrent, currentCoverImage, disableCoverFallback]);

  // Handle favorites toggle
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();

    const coverImageUrl = torrent.coverImage?.url || torrent.coverImage?.tpdbUrl || torrent.coverImage?.detailsUrl || currentCoverImage;

    if (isFavorite) {
      favoritesService.removeFromFavoritesSync(torrent);
    } else {
      favoritesService.addToFavoritesSync(torrent, coverImageUrl || undefined);
    }

    setIsFavorite(!isFavorite);
  };

  const [downloadLoading, setDownloadLoading] = useState(false);

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!effectiveMagnet) return;

    if (hasCachedStreamUrl && !isStreamUrlExpired) {
      const cached = await realDebridService.getCachedStreamUrl(effectiveMagnet);
      if (cached) {
        window.open(cached.streamUrl, '_blank');
        return;
      }
    }

    setDownloadLoading(true);
    try {
      const result = await realDebridService.getStreamableVideoUrl(effectiveMagnet);
      window.open(result.streamUrl, '_blank');
    } catch (error) {
      console.error('Failed to get download link:', error);
    } finally {
      setDownloadLoading(false);
    }
  };

  // Cycle to next fallback URL when the current cover fails to load
  const handleCoverImageError = () => {
    if (coverFallbackIndex < coverFallbackUrls.length) {
      const next = coverFallbackUrls[coverFallbackIndex];
      setCurrentCoverImage(next);
      setCoverFallbackIndex((i) => i + 1);
      return;
    }

    // All static fallbacks exhausted — ask the backend to re-sign/re-resolve once.
    // Guarded by a ref so a broken re-resolved URL doesn't cause an infinite loop.
    if (!coverResolveAttempted.current) {
      coverResolveAttempted.current = true;
      coverImageService.getCoverImageAsync(torrent).then((resolved) => {
        if (resolved && resolved !== currentCoverImage) {
          setCurrentCoverImage(resolved);
        }
      });
      return;
    }
  };

  // Card-specific placeholder image function with appropriate dimensions
  const getCardPlaceholderImage = (torrent: Torrent) => {
    // Use the state-based cover image (which includes backend data)
    const coverImageUrl = currentCoverImage;

    if (coverImageUrl) {
      return {
        backgroundImage: `url("${coverImageUrl.replace(/"/g, '%22')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        color: 'transparent', // Hide the icon when we have a cover image
        fontSize: '3rem',
        position: 'relative' as const,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7))',
          zIndex: 1,
        },
      };
    }

    // Fall back to gradient placeholder
    const name = torrent.Name?.toLowerCase() || '';

    // Generate a gradient based on the torrent name for uniqueness
    const hash = name.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const colors = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#a8edea', '#fed6e3'],
      ['#ff9a9e', '#fecfef'],
      ['#ffecd2', '#fcb69f'],
    ];

    const colorPair = colors[Math.abs(hash) % colors.length];

    return {
      background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 200,
      color: 'white',
      fontSize: '3rem',
    };
  };

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          elevation: 8,
          transform: 'translateY(-4px)',
          transition: 'all 0.3s ease-in-out',
        },
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer',
        position: 'relative',
      }}>
      <CardActionArea
        onClick={() => onClick(torrent)}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}>
        {/* Poster Image Placeholder */}
        <CardMedia sx={getCardPlaceholderImage(torrent)}>
          {/* Hidden probe img — fires onError so we can cycle to next fallback host */}
          {currentCoverImage && (
            <img
              src={currentCoverImage}
              onError={handleCoverImageError}
              alt=''
              style={{ display: 'none' }}
            />
          )}
          {getCategoryIcon(torrent.Category || '')}
        </CardMedia>

        <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
          {/* Title */}
          <Typography
            variant='subtitle2'
            component='h3'
            sx={{
              mb: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              fontWeight: 'bold',
              minHeight: '2.5em',
              lineHeight: 1.25,
            }}>
            {torrent.Name || 'Untitled'}
          </Typography>

          {/* Size and Date */}
          <Box sx={{ mb: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
              }}
            >
              <Inventory2Icon sx={{ fontSize: 14 }} />
              <Typography variant='caption' display='block'>
                {formatSize(torrent.Size)}
              </Typography>
            </Box>
            {torrent.DateUploaded && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'text.secondary',
                }}
              >
                <CalendarMonthIcon sx={{ fontSize: 14 }} />
                <Typography variant='caption' display='block'>
                  {formatDate(torrent.DateUploaded)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Chips */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              mb: 1,
            }}>
            {torrent.Source && (
              <Chip
                label={
                  torrent.Source.charAt(0).toUpperCase() +
                  torrent.Source.slice(1)
                }
                color='primary'
                size='small'
                sx={{ fontSize: '0.6rem', height: 20 }}
              />
            )}
            {torrent.Category && (
              <Chip
                label={torrent.Category}
                variant='outlined'
                size='small'
                sx={{ fontSize: '0.6rem', height: 20 }}
              />
            )}
          </Box>

          {/* Health Status */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <TorrentHealth
              seeders={torrent.Seeders}
              leechers={torrent.Leechers}
            />

            <VisibilityIcon
              fontSize='small'
              color='primary'
              sx={{ opacity: 0.7 }}
            />
          </Box>
        </CardContent>
      </CardActionArea>

      {/* Quick Action Buttons */}
      <Box sx={{ px: 1, pb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            justifyContent: 'center',
          }}>
          {/* Favorites Button */}
          <IconButton
            color={isFavorite ? 'error' : 'default'}
            onClick={handleToggleFavorite}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            size='small'
            disabled={false}
            sx={{
              backgroundColor: isFavorite
                ? 'rgba(244, 67, 54, 0.1)'
                : 'rgba(0, 0, 0, 0.04)',
              '&:hover': {
                backgroundColor: isFavorite
                  ? 'rgba(244, 67, 54, 0.2)'
                  : 'rgba(0, 0, 0, 0.08)',
              },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                opacity: 0.3,
              },
            }}>
            {isFavorite ? (
              <FavoriteIcon fontSize='small' />
            ) : (
              <FavoriteBorderIcon fontSize='small' />
            )}
          </IconButton>

          {/* Cache & Play Button - always show if onCacheAndPlay is provided */}
          {onCacheAndPlay && effectiveMagnet && (
            <IconButton
              color={
                hasCachedStreamUrl
                  ? isStreamUrlExpired
                    ? 'warning'
                    : 'success'
                  : 'primary'
              }
              onClick={(e) => {
                e.stopPropagation();
                // Pass torrent with effective magnet
                const torrentWithMagnet = effectiveMagnet
                  ? { ...torrent, Magnet: effectiveMagnet }
                  : torrent;
                onCacheAndPlay(torrentWithMagnet);
              }}
              title={
                hasCachedStreamUrl
                  ? isStreamUrlExpired
                    ? 'Stream URL expired - click to refresh'
                    : 'Play from cache'
                  : 'Cache and play stream'
              }
              size='small'
              sx={{
                backgroundColor: hasCachedStreamUrl
                  ? isStreamUrlExpired
                    ? 'rgba(255, 152, 0, 0.1)'
                    : 'rgba(76, 175, 80, 0.1)'
                  : 'rgba(25, 118, 210, 0.1)',
                '&:hover': {
                  backgroundColor: hasCachedStreamUrl
                    ? isStreamUrlExpired
                      ? 'rgba(255, 152, 0, 0.2)'
                      : 'rgba(76, 175, 80, 0.2)'
                    : 'rgba(25, 118, 210, 0.2)',
                },
              }}>
              {hasCachedStreamUrl ? (
                isStreamUrlExpired ? (
                  <RefreshIcon fontSize='small' />
                ) : (
                  <CachedIcon fontSize='small' />
                )
              ) : (
                <CloudDownloadIcon fontSize='small' />
              )}
            </IconButton>
          )}

          {/* Direct Play Button (only show if cached URL is available and not expired) */}
          {hasCachedStreamUrl && !isStreamUrlExpired && onDirectPlay && (
            <IconButton
              color='success'
              onClick={(e) => {
                e.stopPropagation();
                // Pass torrent with effective magnet
                const torrentWithMagnet = effectiveMagnet 
                  ? { ...torrent, Magnet: effectiveMagnet } 
                  : torrent;
                onDirectPlay(torrentWithMagnet);
              }}
              title='Play directly from cache'
              size='small'
              sx={{
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(76, 175, 80, 0.2)',
                },
              }}>
              <PlayCircleIcon fontSize='small' />
            </IconButton>
          )}

          {effectiveMagnet && (
            <IconButton
              color='primary'
              onClick={handleDownloadClick}
              disabled={downloadLoading}
              title={
                downloadLoading
                  ? 'Getting download link...'
                  : hasCachedStreamUrl && !isStreamUrlExpired
                    ? 'Download from cached stream'
                    : 'Download via Real-Debrid'
              }
              size='small'>
              {downloadLoading ? (
                <CircularProgress size={18} color='inherit' />
              ) : (
                <DownloadIcon fontSize='small' />
              )}
            </IconButton>
          )}
          {torrent.Url && (
            <IconButton
              color='secondary'
              onClick={(e) => {
                e.stopPropagation();
                window.open(torrent.Url, '_blank');
              }}
              title='View on Source Website'
              size='small'>
              <OpenInNewIcon fontSize='small' />
            </IconButton>
          )}
        </Box>
      </Box>
    </Card>
  );
};

export default TorrentCard;
