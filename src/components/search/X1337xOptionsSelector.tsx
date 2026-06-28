import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';

interface X1337xOptionsSelectorProps {
  sort: string;
  category: string;
  onSortChange: (sort: string) => void;
  onCategoryChange: (category: string) => void;
}

const sortOptions = [
  { value: 'seeders', label: 'Seeders' },
  { value: 'time', label: 'Date' },
  { value: 'size', label: 'Size' },
  { value: 'leechers', label: 'Leechers' },
];

const categoryOptions = [
  { value: '', label: 'All' },
  { value: 'Movies', label: 'Movies' },
  { value: 'TV', label: 'TV Shows' },
  { value: 'Games', label: 'Games' },
  { value: 'Music', label: 'Music' },
  { value: 'Apps', label: 'Apps' },
  { value: 'Anime', label: 'Anime' },
  { value: 'Documentaries', label: 'Documentaries' },
  { value: 'XXX', label: 'XXX' },
  { value: 'Other', label: 'Other' },
];

const X1337xOptionsSelector: React.FC<X1337xOptionsSelectorProps> = ({
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

      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={category}
          label="Category"
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

export default X1337xOptionsSelector;

