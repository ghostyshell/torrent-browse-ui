import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import {
  StudioCategoryOrAll,
  STUDIO_CATEGORY_ORDER,
  STUDIO_CATEGORY_LABELS,
} from '../../data/studioCategories';

interface StudioCategorySelectorProps {
  value: StudioCategoryOrAll;
  onChange: (value: StudioCategoryOrAll) => void;
}

/**
 * Orientation category dropdown (Straight / Gay / Lesbian / Trans / JAV).
 * Drives which studios appear in the Studio selector.
 */
const StudioCategorySelector: React.FC<StudioCategorySelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <FormControl sx={{ minWidth: 140 }}>
      <InputLabel>Category</InputLabel>
      <Select
        value={value}
        label='Category'
        onChange={(e) => onChange(e.target.value as StudioCategoryOrAll)}>
        {STUDIO_CATEGORY_ORDER.map((cat) => (
          <MenuItem key={cat} value={cat}>
            {STUDIO_CATEGORY_LABELS[cat]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default StudioCategorySelector;
