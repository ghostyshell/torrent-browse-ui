import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import {
  StudioCategoryOrAll,
  studiosForCategory,
} from '../../data/studioCategories';

interface CustomFilterSelectorProps {
  filter: string;
  onChange: (filter: string) => void;
  /** Orientation category to scope the studio list to (default: all). */
  category?: StudioCategoryOrAll;
}

const CustomFilterSelector: React.FC<CustomFilterSelectorProps> = ({
  filter,
  onChange,
  category = 'all',
}) => {
  const studios = studiosForCategory(category);
  // Keep a selected-but-out-of-category studio visible to avoid a stale value
  // (and MUI's out-of-range warning) until the parent resets it.
  const options =
    filter && !studios.includes(filter) ? [filter, ...studios] : studios;

  return (
    <FormControl sx={{ minWidth: 120 }}>
      <InputLabel>Studio</InputLabel>
      <Select
        value={filter}
        label='Studio'
        onChange={(e) => onChange(e.target.value)}>
        <MenuItem value=''>None</MenuItem>
        {options.map((studio) => (
          <MenuItem key={studio} value={studio}>
            {studio}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default CustomFilterSelector;
