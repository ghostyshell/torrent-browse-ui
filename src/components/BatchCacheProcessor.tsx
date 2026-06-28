import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cached as CachedIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Description as DescriptionIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Torrent } from '../types/Torrent';
import { FavoriteTorrent } from '../services/favoritesService';
import { realDebridService } from '../services/realDebridService';
import { streamUrlCache } from '../utils/streamUrlCache';
import { descriptionImageService } from '../services/descriptionImageService';

interface BatchProcessingResult {
  torrent: Torrent | FavoriteTorrent;
  status: 'pending' | 'processing' | 'completed' | 'skipped' | 'error';
  error?: string;
  stage?:
    | 'checking_cache'
    | 'adding_magnet'
    | 'processing_torrent'
    | 'selecting_files'
    | 'getting_stream_url'
    | 'caching_url'
    | 'fetching_description'
    | 'extracting_images'
    | 'setting_cover';
  progress?: number;
  // Additional data for description processing
  imagesFound?: number;
  coverSet?: boolean;
}

interface BatchCacheProcessorProps {
  torrents: (Torrent | FavoriteTorrent)[];
  title?: string;
}

const BatchCacheProcessor: React.FC<BatchCacheProcessorProps> = ({
  torrents,
  title = 'Batch Cache & Play',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [results, setResults] = useState<BatchProcessingResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [shouldStop, setShouldStop] = useState(false);

  // Separate state for description processing
  const [isProcessingDescriptions, setIsProcessingDescriptions] =
    useState(false);
  const [isPausedDescriptions, setIsPausedDescriptions] = useState(false);
  const [descriptionResults, setDescriptionResults] = useState<
    BatchProcessingResult[]
  >([]);
  const [currentDescriptionIndex, setCurrentDescriptionIndex] = useState(0);
  const [totalDescriptionsProcessed, setTotalDescriptionsProcessed] =
    useState(0);
  const [shouldStopDescriptions, setShouldStopDescriptions] = useState(false);
  const [overallDescriptionProgress, setOverallDescriptionProgress] =
    useState(0);

  // State for refresh last results functionality
  const [isRefreshingResults, setIsRefreshingResults] = useState(false);

  const resetState = useCallback(() => {
    setResults([]);
    setCurrentIndex(0);
    setTotalProcessed(0);
    setOverallProgress(0);
    setShouldStop(false);
    setIsPaused(false);
    setIsRefreshingResults(false);
  }, []);

  const resetDescriptionState = useCallback(() => {
    setDescriptionResults([]);
    setCurrentDescriptionIndex(0);
    setTotalDescriptionsProcessed(0);
    setOverallDescriptionProgress(0);
    setShouldStopDescriptions(false);
    setIsPausedDescriptions(false);
  }, []);

  const initializeResults = useCallback(
    (torrents: (Torrent | FavoriteTorrent)[]) => {
      return torrents.map((torrent) => ({
        torrent,
        status: 'pending' as const,
      }));
    },
    []
  );

  const updateResult = useCallback(
    (index: number, update: Partial<BatchProcessingResult>) => {
      setResults((prev) => {
        const newResults = [...prev];
        newResults[index] = { ...newResults[index], ...update };
        return newResults;
      });
    },
    []
  );

  const updateDescriptionResult = useCallback(
    (index: number, update: Partial<BatchProcessingResult>) => {
      setDescriptionResults((prev) => {
        const newResults = [...prev];
        newResults[index] = { ...newResults[index], ...update };
        return newResults;
      });
    },
    []
  );

  const processSingleTorrent = async (
    torrent: Torrent | FavoriteTorrent,
    index: number,
    forceRefresh: boolean = false
  ): Promise<void> => {
    if (!torrent.Magnet) {
      updateResult(index, {
        status: 'error',
        error: 'No magnet link available',
      });
      return;
    }

    try {
      // Stage 1: Check if already cached (skip if force refresh)
      updateResult(index, {
        status: 'processing',
        stage: 'checking_cache',
        progress: 0,
      });

      if (!forceRefresh) {
        const cachedResult = await streamUrlCache.get(torrent.Magnet);
        if (cachedResult) {
          updateResult(index, {
            status: 'skipped',
            stage: 'checking_cache',
            progress: 100,
          });
          return;
        }
      } else {
        // Force refresh mode - will bypass all caches
        updateResult(index, {
          stage: 'checking_cache',
          progress: 10,
        });
      }

      // Stage 2: Use the existing service method that handles all stages
      updateResult(index, {
        stage: 'adding_magnet',
        progress: 20,
      });

      // Update progress through different stages as we don't have granular control
      updateResult(index, {
        stage: 'processing_torrent',
        progress: 40,
      });

      updateResult(index, {
        stage: 'selecting_files',
        progress: 60,
      });

      updateResult(index, {
        stage: 'getting_stream_url',
        progress: 80,
      });

      updateResult(index, {
        stage: 'caching_url',
        progress: 90,
      });

      // This method handles all the complex Real-Debrid logic and caching
      // Pass forceRefresh to bypass ALL caches (localStorage + SQLite backend)
      await realDebridService.getStreamableVideoUrl(torrent.Magnet, forceRefresh);

      updateResult(index, {
        status: 'completed',
        progress: 100,
      });
    } catch (error) {
      updateResult(index, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const processSingleTorrentDescription = async (
    torrent: Torrent | FavoriteTorrent,
    index: number,
    forceRefresh: boolean = false
  ): Promise<void> => {
    if (!torrent.Url) {
      updateDescriptionResult(index, {
        status: 'error',
        error: 'No URL available for fetching details',
      });
      return;
    }

    try {
      // Stage 1: Check if already cached (skip check when force refreshing)
      updateDescriptionResult(index, {
        status: 'processing',
        stage: 'checking_cache',
        progress: 0,
      });

      if (!forceRefresh) {
        const cachedDescription =
          descriptionImageService.getCachedDescription(torrent);
        if (cachedDescription && cachedDescription.images?.length > 0) {
          updateDescriptionResult(index, {
            status: 'skipped',
            stage: 'checking_cache',
            progress: 100,
            imagesFound: cachedDescription.images.length,
          });
          return;
        }
      }

      // Stage 2: Fetch description and extract images
      updateDescriptionResult(index, {
        stage: 'fetching_description',
        progress: 20,
      });

      updateDescriptionResult(index, {
        stage: 'extracting_images',
        progress: 60,
      });

      updateDescriptionResult(index, {
        stage: 'setting_cover',
        progress: 80,
      });

      // Process the torrent using the description service
      const result =
        await descriptionImageService.processTorrentDescriptionAndImages(
          torrent,
          { forceRefresh }
        );

      if (result.success) {
        updateDescriptionResult(index, {
          status: 'completed',
          progress: 100,
          imagesFound: result.imagesFound,
          coverSet: result.coverSet,
        });
      } else {
        updateDescriptionResult(index, {
          status: 'error',
          error: result.error,
          imagesFound: result.imagesFound,
        });
      }
    } catch (error) {
      updateDescriptionResult(index, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const startBatchProcessing = async (forceRefresh: boolean = false) => {
    if (!realDebridService.isConfigured()) {
      alert(
        'Real-Debrid API key not configured. Please configure your API key in Account Settings to enable premium streaming.'
      );
      return;
    }

    setIsProcessing(true);
    setShouldStop(false);
    setIsPaused(false);
    resetState();

    const initialResults = initializeResults(torrents);
    setResults(initialResults);

    let processed = 0;

    for (let i = 0; i < torrents.length; i++) {
      if (shouldStop) {
        break;
      }

      // Handle pause
      while (isPaused && !shouldStop) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (shouldStop) {
        break;
      }

      setCurrentIndex(i);

      try {
        await processSingleTorrent(torrents[i], i, forceRefresh);
      } catch (error) {
        // Error already handled in processSingleTorrent
      }

      processed++;
      setTotalProcessed(processed);
      setOverallProgress((processed / torrents.length) * 100);

      // Small delay between processing items
      if (i < torrents.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
    setCurrentIndex(-1);
  };

  const startBatchDescriptionProcessing = async (forceRefresh: boolean = false) => {
    setIsProcessingDescriptions(true);
    setShouldStopDescriptions(false);
    setIsPausedDescriptions(false);
    resetDescriptionState();

    const initialResults = initializeResults(torrents);
    setDescriptionResults(initialResults);

    let processed = 0;

    for (let i = 0; i < torrents.length; i++) {
      if (shouldStopDescriptions) {
        break;
      }

      // Handle pause
      while (isPausedDescriptions && !shouldStopDescriptions) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (shouldStopDescriptions) {
        break;
      }

      setCurrentDescriptionIndex(i);

      try {
        await processSingleTorrentDescription(torrents[i], i, forceRefresh);
      } catch (error) {
        // Error already handled in processSingleTorrentDescription
      }

      processed++;
      setTotalDescriptionsProcessed(processed);
      setOverallDescriptionProgress((processed / torrents.length) * 100);

      // Small delay between processing items
      if (i < torrents.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Longer delay for API calls
      }
    }

    setIsProcessingDescriptions(false);
    setCurrentDescriptionIndex(-1);
  };

  const startRefreshLastResults = async () => {
    if (!realDebridService.isConfigured()) {
      alert(
        'Real-Debrid API key not configured. Please configure your API key in Account Settings to enable premium streaming.'
      );
      return;
    }

    // Get only the torrents that were successfully cached in the last run
    const successfullyProcessed = results
      .filter(
        (result) => result.status === 'completed' || result.status === 'skipped'
      )
      .map((result, originalIndex) => ({
        torrent: result.torrent,
        originalIndex: results.findIndex((r) => r.torrent === result.torrent),
      }));

    if (successfullyProcessed.length === 0) {
      alert(
        'No successfully cached torrents found to refresh. Please run "Cache Stream URLs" first.'
      );
      return;
    }

    setIsRefreshingResults(true);
    setIsProcessing(true);
    setShouldStop(false);
    setIsPaused(false);

    // Reset only the results that we're going to refresh
    const updatedResults = [...results];
    successfullyProcessed.forEach(({ originalIndex }) => {
      updatedResults[originalIndex] = {
        ...updatedResults[originalIndex],
        status: 'pending',
        error: undefined,
        stage: undefined,
        progress: 0,
      };
    });
    setResults(updatedResults);

    let processed = 0;
    setTotalProcessed(0);
    setOverallProgress(0);

    for (let i = 0; i < successfullyProcessed.length; i++) {
      if (shouldStop) {
        break;
      }

      // Handle pause
      while (isPaused && !shouldStop) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (shouldStop) {
        break;
      }

      const { torrent, originalIndex } = successfullyProcessed[i];
      setCurrentIndex(originalIndex);

      try {
        // Force refresh: always clear cache and re-fetch
        await processSingleTorrent(torrent, originalIndex, true);
      } catch (error) {
        // Error already handled in processSingleTorrent
      }

      processed++;
      setTotalProcessed(processed);
      setOverallProgress((processed / successfullyProcessed.length) * 100);

      // Small delay between processing items
      if (i < successfullyProcessed.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
    setIsRefreshingResults(false);
    setCurrentIndex(-1);
  };

  const pauseProcessing = () => {
    setIsPaused(true);
  };

  const resumeProcessing = () => {
    setIsPaused(false);
  };

  const stopProcessing = () => {
    setShouldStop(true);
    setIsProcessing(false);
    setIsPaused(false);
    setIsRefreshingResults(false);
  };

  const pauseDescriptionProcessing = () => {
    setIsPausedDescriptions(true);
  };

  const resumeDescriptionProcessing = () => {
    setIsPausedDescriptions(false);
  };

  const stopDescriptionProcessing = () => {
    setShouldStopDescriptions(true);
    setIsProcessingDescriptions(false);
    setIsPausedDescriptions(false);
  };

  const getStatusIcon = (result: BatchProcessingResult) => {
    switch (result.status) {
      case 'completed':
        return <CheckCircleIcon color='success' />;
      case 'skipped':
        return <CachedIcon color='info' />;
      case 'error':
        return <ErrorIcon color='error' />;
      case 'processing':
        return <CircularProgress size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'skipped':
        return 'info';
      case 'error':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStageText = (stage?: string) => {
    switch (stage) {
      case 'checking_cache':
        return 'Checking cache...';
      case 'adding_magnet':
        return 'Adding to Real-Debrid...';
      case 'processing_torrent':
        return 'Processing torrent...';
      case 'selecting_files':
        return 'Selecting video files...';
      case 'getting_stream_url':
        return 'Getting stream URL...';
      case 'caching_url':
        return 'Caching URL...';
      case 'fetching_description':
        return 'Fetching description...';
      case 'extracting_images':
        return 'Extracting images...';
      case 'setting_cover':
        return 'Setting cover image...';
      default:
        return '';
    }
  };

  const completedCount = results.filter((r) => r.status === 'completed').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  const descriptionCompletedCount = descriptionResults.filter(
    (r) => r.status === 'completed'
  ).length;
  const descriptionSkippedCount = descriptionResults.filter(
    (r) => r.status === 'skipped'
  ).length;
  const descriptionErrorCount = descriptionResults.filter(
    (r) => r.status === 'error'
  ).length;
  const totalImagesFound = descriptionResults.reduce(
    (total, r) => total + (r.imagesFound || 0),
    0
  );
  const totalCoversSet = descriptionResults.filter((r) => r.coverSet).length;

  if (torrents.length === 0) {
    return null;
  }

  return (
    <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
      <CardContent>
        <Box
          onClick={() => setIsExpanded((prev) => !prev)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: isExpanded ? 2 : 0,
            cursor: 'pointer',
          }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size='small' sx={{ p: 0.5 }}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant='h6' component='div'>
              {title}
            </Typography>
          </Box>
          <Typography variant='body2' color='text.secondary'>
            {torrents.length} torrents available
          </Typography>
        </Box>

        <Collapse in={isExpanded} timeout='auto' unmountOnExit>
        {!isProcessing &&
          !isProcessingDescriptions &&
          results.length === 0 &&
          descriptionResults.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Choose a batch processing option for all torrents on this page:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}>
                <Button
                  variant='contained'
                  startIcon={<PlayArrowIcon />}
                  onClick={() => startBatchProcessing(false)}
                  size='large'>
                  Cache Stream URLs
                </Button>
                <Button
                  variant='contained'
                  color='warning'
                  startIcon={<RefreshIcon />}
                  onClick={() => startBatchProcessing(true)}
                  size='large'>
                  Force Refresh Stream URLs
                </Button>
                <Button
                  variant='contained'
                  color='secondary'
                  startIcon={<DescriptionIcon />}
                  onClick={() => startBatchDescriptionProcessing(false)}
                  size='large'>
                  Cache Descriptions & Images
                </Button>
                <Button
                  variant='contained'
                  color='warning'
                  startIcon={<RefreshIcon />}
                  onClick={() => startBatchDescriptionProcessing(true)}
                  size='large'>
                  Force Cache Descriptions & Images
                </Button>
              </Box>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mt: 2, display: 'block' }}>
                Stream URLs: Cache for video streaming. Force Refresh: Clear
                existing cache and fetch fresh URLs from Real-Debrid.
                Descriptions: Fetch details and auto-set cover images (skips
                existing). Force Cache: Re-fetch and replace all cover images.
              </Typography>
            </Box>
          )}

        {isProcessing && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant='body1'>
                {isRefreshingResults
                  ? `Force Refreshing ${currentIndex + 1} of ${
                      results.filter(
                        (r) =>
                          r.status === 'completed' || r.status === 'skipped'
                      ).length
                    } cached torrents`
                  : `Processing ${currentIndex + 1} of ${torrents.length}`}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!isPaused ? (
                  <IconButton onClick={pauseProcessing} size='small'>
                    <PauseIcon />
                  </IconButton>
                ) : (
                  <Button
                    onClick={resumeProcessing}
                    size='small'
                    variant='outlined'>
                    Resume
                  </Button>
                )}
                <IconButton onClick={stopProcessing} size='small' color='error'>
                  <StopIcon />
                </IconButton>
              </Box>
            </Box>

            <LinearProgress
              variant='determinate'
              value={overallProgress}
              sx={{ mb: 2, height: 8, borderRadius: 4 }}
            />

            {currentIndex >= 0 && currentIndex < results.length && (
              <Box sx={{ mb: 2 }}>
                <Typography variant='body2' gutterBottom>
                  Current: {results[currentIndex]?.torrent.Name}
                  {isRefreshingResults && (
                    <Chip
                      size='small'
                      label='Force Refreshing'
                      color='warning'
                      variant='outlined'
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
                {results[currentIndex]?.stage && (
                  <Typography variant='caption' color='text.secondary'>
                    {getStageText(results[currentIndex].stage)}
                  </Typography>
                )}
              </Box>
            )}

            {isPaused && (
              <Alert severity='info' sx={{ mb: 2 }}>
                {isRefreshingResults
                  ? 'Force refresh paused'
                  : 'Processing paused'}
                . Click Resume to continue.
              </Alert>
            )}
          </Box>
        )}

        {isProcessingDescriptions && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant='body1'>
                Processing Descriptions {currentDescriptionIndex + 1} of{' '}
                {torrents.length}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!isPausedDescriptions ? (
                  <IconButton onClick={pauseDescriptionProcessing} size='small'>
                    <PauseIcon />
                  </IconButton>
                ) : (
                  <Button
                    onClick={resumeDescriptionProcessing}
                    size='small'
                    variant='outlined'>
                    Resume
                  </Button>
                )}
                <IconButton
                  onClick={stopDescriptionProcessing}
                  size='small'
                  color='error'>
                  <StopIcon />
                </IconButton>
              </Box>
            </Box>

            <LinearProgress
              variant='determinate'
              value={overallDescriptionProgress}
              sx={{ mb: 2, height: 8, borderRadius: 4 }}
            />

            {currentDescriptionIndex >= 0 &&
              currentDescriptionIndex < descriptionResults.length && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant='body2' gutterBottom>
                    Current:{' '}
                    {descriptionResults[currentDescriptionIndex]?.torrent.Name}
                  </Typography>
                  {descriptionResults[currentDescriptionIndex]?.stage && (
                    <Typography variant='caption' color='text.secondary'>
                      {getStageText(
                        descriptionResults[currentDescriptionIndex].stage
                      )}
                    </Typography>
                  )}
                </Box>
              )}

            {isPausedDescriptions && (
              <Alert severity='info' sx={{ mb: 2 }}>
                Description processing paused. Click Resume to continue.
              </Alert>
            )}
          </Box>
        )}

        {(results.length > 0 || descriptionResults.length > 0) && (
          <Box>
            {results.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant='h6' gutterBottom>
                  Stream URL Processing Results
                </Typography>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant='body1'>
                    Progress: {totalProcessed} / {torrents.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {completedCount > 0 && (
                      <Chip
                        size='small'
                        label={`${completedCount} cached`}
                        color='success'
                        variant='outlined'
                      />
                    )}
                    {skippedCount > 0 && (
                      <Chip
                        size='small'
                        label={`${skippedCount} skipped`}
                        color='info'
                        variant='outlined'
                      />
                    )}
                    {errorCount > 0 && (
                      <Chip
                        size='small'
                        label={`${errorCount} errors`}
                        color='error'
                        variant='outlined'
                      />
                    )}
                  </Box>
                </Box>

                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  endIcon={
                    showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />
                  }
                  size='small'>
                  {showDetails ? 'Hide' : 'Show'} Stream Details
                </Button>

                {/* Add Force Refresh Last Results button */}
                {!isProcessing &&
                  !isProcessingDescriptions &&
                  completedCount + skippedCount > 0 && (
                    <Button
                      variant='outlined'
                      color='warning'
                      startIcon={<RefreshIcon />}
                      onClick={startRefreshLastResults}
                      size='small'
                      sx={{ ml: 1 }}>
                      Force Refresh Last Results (
                      {completedCount + skippedCount})
                    </Button>
                  )}

                <Collapse in={showDetails}>
                  <List dense sx={{ mt: 1, maxHeight: 300, overflow: 'auto' }}>
                    {results.map((result, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          bgcolor:
                            index === currentIndex
                              ? 'action.selected'
                              : 'transparent',
                        }}>
                        <Box sx={{ mr: 1 }}>{getStatusIcon(result)}</Box>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}>
                              <Typography
                                variant='body2'
                                noWrap
                                sx={{ flex: 1 }}>
                                {result.torrent.Name}
                              </Typography>
                              <Chip
                                size='small'
                                label={result.status}
                                color={getStatusColor(result.status) as any}
                                variant='outlined'
                              />
                            </Box>
                          }
                          secondary={
                            result.error ? (
                              <Typography variant='caption' color='error'>
                                {result.error}
                              </Typography>
                            ) : result.stage ? (
                              <Typography
                                variant='caption'
                                color='text.secondary'>
                                {getStageText(result.stage)}
                              </Typography>
                            ) : null
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
            )}

            {descriptionResults.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant='h6' gutterBottom>
                  Description & Image Processing Results
                </Typography>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant='body1'>
                    Progress: {totalDescriptionsProcessed} / {torrents.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {descriptionCompletedCount > 0 && (
                      <Chip
                        size='small'
                        label={`${descriptionCompletedCount} processed`}
                        color='success'
                        variant='outlined'
                      />
                    )}
                    {descriptionSkippedCount > 0 && (
                      <Chip
                        size='small'
                        label={`${descriptionSkippedCount} skipped`}
                        color='info'
                        variant='outlined'
                      />
                    )}
                    {totalImagesFound > 0 && (
                      <Chip
                        size='small'
                        label={`${totalImagesFound} images found`}
                        color='primary'
                        variant='outlined'
                      />
                    )}
                    {totalCoversSet > 0 && (
                      <Chip
                        size='small'
                        label={`${totalCoversSet} covers set`}
                        color='secondary'
                        variant='outlined'
                      />
                    )}
                    {descriptionErrorCount > 0 && (
                      <Chip
                        size='small'
                        label={`${descriptionErrorCount} errors`}
                        color='error'
                        variant='outlined'
                      />
                    )}
                  </Box>
                </Box>

                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  endIcon={
                    showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />
                  }
                  size='small'>
                  {showDetails ? 'Hide' : 'Show'} Description Details
                </Button>

                <Collapse in={showDetails}>
                  <List dense sx={{ mt: 1, maxHeight: 300, overflow: 'auto' }}>
                    {descriptionResults.map((result, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          bgcolor:
                            index === currentDescriptionIndex
                              ? 'action.selected'
                              : 'transparent',
                        }}>
                        <Box sx={{ mr: 1 }}>{getStatusIcon(result)}</Box>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}>
                              <Typography
                                variant='body2'
                                noWrap
                                sx={{ flex: 1 }}>
                                {result.torrent.Name}
                              </Typography>
                              <Chip
                                size='small'
                                label={result.status}
                                color={getStatusColor(result.status) as any}
                                variant='outlined'
                              />
                              {result.imagesFound !== undefined && (
                                <Chip
                                  size='small'
                                  label={`${result.imagesFound} img`}
                                  color='primary'
                                  variant='outlined'
                                />
                              )}
                              {result.coverSet && (
                                <Chip
                                  size='small'
                                  label='cover set'
                                  color='secondary'
                                  variant='outlined'
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            result.error ? (
                              <Typography variant='caption' color='error'>
                                {result.error}
                              </Typography>
                            ) : result.stage ? (
                              <Typography
                                variant='caption'
                                color='text.secondary'>
                                {getStageText(result.stage)}
                              </Typography>
                            ) : null
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
            )}

            {!isProcessing && !isProcessingDescriptions && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant='outlined'
                  onClick={() => {
                    resetState();
                    resetDescriptionState();
                  }}>
                  Reset All
                </Button>
              </Box>
            )}
          </Box>
        )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default BatchCacheProcessor;
