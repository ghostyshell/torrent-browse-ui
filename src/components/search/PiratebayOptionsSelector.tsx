import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Box } from '@mui/material';

interface PiratebayOptionsSelectorProps {
  sort: string;
  category: string;
  onSortChange: (sort: string) => void;
  onCategoryChange: (category: string) => void;
}

const sortOptions = [
  { value: '7', label: 'Seeders' },
  { value: '3', label: 'Date' },
  { value: '8', label: 'Size' },
  { value: '99', label: 'Name' },
];

const categoryOptions = [
  { value: '0', label: 'All' },
  { value: '100', label: 'Audio' },
  { value: '200', label: 'Video' },
  { value: '300', label: 'Applications' },
  { value: '400', label: 'Games' },
  { value: '505', label: 'HD Porn' },
  { value: '507', label: 'UHD/4K Porn' },
];

const PiratebayOptionsSelector: React.FC<PiratebayOptionsSelectorProps> = ({
  sort,
  category,
  onSortChange,
  onCategoryChange,
}) => {
  const handleSortChange = (event: SelectChangeEvent) => {
    onSortChange(event.target.value);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    onCategoryChange(event.target.value);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>Sort</InputLabel>
        <Select
          value={sort}
          label="Sort"
          onChange={handleSortChange}
        >
          {sortOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Section</InputLabel>
        <Select
          value={category}
          label="Section"
          onChange={handleCategoryChange}
        >
          {categoryOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default PiratebayOptionsSelector;
