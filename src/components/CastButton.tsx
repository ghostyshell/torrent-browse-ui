import React from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Cast as CastIcon, CastConnected as CastConnectedIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import type { CastState } from '../services/googleCastService';

interface CastButtonProps {
  /**
   * Show the button whenever the Cast SDK is loaded (Chromium browsers), not
   * only when a device is already discovered. Chromium does lazy discovery —
   * it won't scan for devices until the user interacts with a cast affordance,
   * so the button must be visible for the click that *starts* discovery and
   * opens the device picker (this is how YouTube's cast button behaves).
   */
  available: boolean;
  /** Connected and casting the current video (button becomes "stop"). */
  isCastingThis: boolean;
  castState: CastState;
  onClick: () => void;
  sx?: SxProps<Theme>;
}

/**
 * Chromecast launch/stop button. Presentational only — connection logic lives
 * in {@link useGoogleCast}; the parent owns the hook and passes state down.
 */
const CastButton: React.FC<CastButtonProps> = ({
  available,
  isCastingThis,
  castState,
  onClick,
  sx,
}) => {
  if (!available) return null;

  const connecting = castState === 'CONNECTING';
  const label = isCastingThis
    ? 'Stop casting'
    : connecting
    ? 'Connecting…'
    : 'Cast to TV';

  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          onClick={onClick}
          disabled={connecting}
          aria-label={label}
          sx={{
            color: isCastingThis ? 'primary.light' : 'white',
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            ...sx,
          }}>
          {connecting ? (
            <CircularProgress size={20} sx={{ color: 'white' }} />
          ) : isCastingThis ? (
            <CastConnectedIcon />
          ) : (
            <CastIcon />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default CastButton;
