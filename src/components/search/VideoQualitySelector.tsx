import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface VideoQualitySelectorProps {
  quality: string;
  onChange: (quality: string) => void;
}

const VideoQualitySelector: React.FC<VideoQualitySelectorProps> = ({
  quality,
  onChange,
}) => {
  const qualityOptions = [
    { value: '', label: 'None' },
    { value: '2160p', label: '2160p (4K)' },
    { value: '1080p', label: '1080p (HD)' },
  ];

  return (
    <FormControl sx={{ minWidth: 120 }}>
      <InputLabel>Quality</InputLabel>
      <Select
        value={quality}
        label='Quality'
        onChange={(e) => onChange(e.target.value)}>
        {qualityOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default VideoQualitySelector;
