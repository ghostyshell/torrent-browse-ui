import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Paper,
  Fade,
  useTheme,
  Chip,
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';

interface ProgressBarProps {
  show: boolean;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
  title?: string;
  icon?: React.ReactNode;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  show,
  progress,
  title = 'Processing',
  icon = <PhotoCameraIcon />,
}) => {
  const theme = useTheme();

  if (!show || !progress) {

    return null;
  }

  const progressPercentage = Math.min(
    Math.max((progress.current / progress.total) * 100, 0),
    100
  );

  // Determine progress stage based on current value
  const getProgressStage = () => {
    if (progressPercentage < 20) return 'Starting';
    if (progressPercentage < 40) return 'Ingesting';
    if (progressPercentage < 60) return 'Processing';
    if (progressPercentage < 90) return 'Generating';
    if (progressPercentage < 100) return 'Finalizing';
    return 'Complete';
  };

  const getProgressColor = () => {
    if (progressPercentage < 30) return theme.palette.warning.main;
    if (progressPercentage < 70) return theme.palette.info.main;
    return theme.palette.success.main;
  };

  return (
    <Fade in={show} timeout={300}>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          width: { xs: '90%', sm: '450px' },
          p: 3,
          bgcolor: theme.palette.background.paper,
          borderRadius: 3,
          border: `2px solid ${theme.palette.divider}`,
          zIndex: 1500,
          backdropFilter: 'blur(20px)',
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.grey[900]})`
              : `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.grey[50]})`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, ${
            theme.palette.mode === 'dark' ? '0.3' : '0.15'
          }), 0 0 0 1px ${theme.palette.divider}`,
        }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2.5,
          }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: getProgressColor(),
                color: 'white',
                animation:
                  progressPercentage < 100 ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)', opacity: 1 },
                  '50%': { transform: 'scale(1.05)', opacity: 0.8 },
                  '100%': { transform: 'scale(1)', opacity: 1 },
                },
              }}>
              {icon}
            </Box>
            <Typography
              variant='h6'
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}>
              {title}
            </Typography>
          </Box>

          <Chip
            label={getProgressStage()}
            size='small'
            sx={{
              bgcolor: getProgressColor(),
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2.5 }}>
          <LinearProgress
            variant='determinate'
            value={progressPercentage}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor:
                theme.palette.mode === 'dark'
                  ? theme.palette.grey[800]
                  : theme.palette.grey[300],
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: `linear-gradient(90deg, ${getProgressColor()}, ${getProgressColor()}dd)`,
                transition: 'all 0.3s ease-in-out',
              },
            }}
          />
        </Box>

        {/* Progress Details */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}>
          <Typography
            variant='body1'
            sx={{
              color: theme.palette.text.primary,
              fontWeight: 600,
              fontSize: '1.1rem',
            }}>
            {progressPercentage.toFixed(1)}%
          </Typography>
          <Typography
            variant='caption'
            sx={{
              color:
                theme.palette.mode === 'dark'
                  ? theme.palette.text.secondary
                  : theme.palette.text.primary,
              fontWeight: 500,
              bgcolor:
                theme.palette.mode === 'dark'
                  ? theme.palette.grey[800]
                  : theme.palette.grey[200],
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}>
            {progress.current} / {progress.total}
          </Typography>
        </Box>

        {/* Progress Message */}
        <Box
          sx={{
            p: 1.5,
            bgcolor:
              theme.palette.mode === 'dark'
                ? theme.palette.grey[900]
                : theme.palette.grey[100],
            borderRadius: 2,
            border: `1px solid ${
              theme.palette.mode === 'dark'
                ? theme.palette.grey[700]
                : theme.palette.grey[300]
            }`,
          }}>
          <Typography
            variant='body2'
            sx={{
              color: theme.palette.text.primary,
              fontWeight: 500,
              textAlign: 'center',
              minHeight: '1.2em',
              fontSize: '0.9rem',
            }}>
            {progress.message}
          </Typography>
        </Box>

        {/* Animated dots for visual feedback */}
        {progressPercentage < 100 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 0.5,
              mt: 1.5,
            }}>
            {[0, 1, 2].map((index) => (
              <Box
                key={index}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: getProgressColor(),
                  animation: `dotPulse 1.5s infinite ${index * 0.2}s`,
                  '@keyframes dotPulse': {
                    '0%, 20%': { opacity: 0.3 },
                    '10%': { opacity: 1 },
                    '100%': { opacity: 0.3 },
                  },
                }}
              />
            ))}
          </Box>
        )}
      </Paper>
    </Fade>
  );
};

export default ProgressBar;
