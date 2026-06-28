import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Link as LinkIcon,
  PlayArrow as PlayIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { storedLinksService, StoredLink } from '../services/storedLinksService';
import { realDebridService } from '../services/realDebridService';

interface LinkCachingComponentProps {
  onLinkCached?: (link: StoredLink) => void;
}

const LinkCachingComponent: React.FC<LinkCachingComponentProps> = ({
  onLinkCached,
}) => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const isMagnetLink = (url: string): boolean => {
    return url.toLowerCase().startsWith('magnet:');
  };

  const handleCacheAndStream = async () => {
    if (!url.trim()) {
      setMessage({
        text: 'Please enter a valid URL or magnet link',
        type: 'error',
      });
      return;
    }

    if (!isMagnetLink(url) && !isValidUrl(url)) {
      setMessage({
        text: 'Please enter a valid URL or magnet link',
        type: 'error',
      });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // Add to cached links first
      const cachedLink = await storedLinksService.addStoredLink(url);

      // If it's a magnet link, try to start streaming immediately
      if (isMagnetLink(url)) {
        setMessage({ text: 'Preparing stream...', type: 'info' });

        try {
          const streamResult = await realDebridService.getStreamableVideoUrl(
            url
          );

          // Update the cached link with stream URL
          storedLinksService.updateStoredLinkSync(cachedLink.id, {
            streamUrl: streamResult.streamUrl,
            isStreaming: true,
            supportsRangeRequests: streamResult.supportsRangeRequests,
            filename: streamResult.filename,
          });

          setMessage({
            text: 'Link cached and stream prepared! Go to Cached Links to play it in the video player.',
            type: 'success',
          });
        } catch (streamError: any) {
          // Still add to cache even if streaming fails
          storedLinksService.updateStoredLinkSync(cachedLink.id, {
            error: streamError.message || 'Failed to prepare stream',
          });

          setMessage({
            text: 'Link cached but streaming failed. You can retry from the Cached Links page.',
            type: 'error',
          });
        }
      } else {
        setMessage({
          text: 'Link cached successfully! You can access it from the Cached Links page.',
          type: 'success',
        });
      }

      // Clear the input
      setUrl('');

      // Notify parent component
      if (onLinkCached) {
        onLinkCached(cachedLink);
      }
    } catch (error: any) {
      console.error('Error caching link:', error);
      setMessage({
        text: error.message || 'Failed to cache link',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isProcessing) {
      handleCacheAndStream();
    }
  };

  // Auto-clear message after 5 seconds
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LinkIcon color='primary' />
        <Typography variant='h6' component='h2'>
          Quick Link Caching & Streaming
        </Typography>
        <Tooltip title='Paste any magnet link or streaming URL to cache it and start streaming instantly. Cached links are saved for later access.'>
          <IconButton size='small'>
            <InfoIcon fontSize='small' />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          variant='outlined'
          placeholder='Paste magnet link or streaming URL here...'
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isProcessing}
          size='small'
          sx={{ flex: 1 }}
        />

        <Button
          variant='contained'
          startIcon={isMagnetLink(url) ? <PlayIcon /> : <AddIcon />}
          onClick={handleCacheAndStream}
          disabled={isProcessing || !url.trim()}
          sx={{ minWidth: '160px' }}>
          {isProcessing
            ? 'Processing...'
            : isMagnetLink(url)
            ? 'Cache & Stream'
            : 'Cache Link'}
        </Button>
      </Box>

      {message && (
        <Alert
          severity={message.type}
          sx={{ mt: 2 }}
          onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ display: 'block', mt: 1 }}>
        💡 Supported: Magnet links (auto-streaming), HTTP/HTTPS URLs, Direct
        download links
      </Typography>
    </Paper>
  );
};

export default LinkCachingComponent;
