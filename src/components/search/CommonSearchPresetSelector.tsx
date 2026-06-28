import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import {
  SEARCH_PRESET_TOKENS,
  CommonSearchMode,
} from '../../data/commonSearchPresets';

interface CommonSearchPresetSelectorProps {
  value: CommonSearchMode;
  onChange: (mode: CommonSearchMode) => void;
}

const CommonSearchPresetSelector: React.FC<CommonSearchPresetSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <FormControl sx={{ minWidth: 160 }}>
      <InputLabel>Common search</InputLabel>
      <Select
        value={value}
        label='Common search'
        onChange={(e) => onChange(e.target.value as CommonSearchMode)}>
        <MenuItem value='browse'>Latest uploads (browse)</MenuItem>
        {SEARCH_PRESET_TOKENS.map((p) => (
          <MenuItem key={p} value={p}>
            {p}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default CommonSearchPresetSelector;
