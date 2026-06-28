import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';

interface PageLimitSelectorProps {
  pageLimit: number;
  onPageLimitChange: (limit: number) => void;
  disabled?: boolean;
  options?: number[];
}

const PageLimitSelector: React.FC<PageLimitSelectorProps> = ({
  pageLimit,
  onPageLimitChange,
  disabled = false,
  options = [10, 20, 50, 100]
}) => {
  const handleChange = (event: SelectChangeEvent<number>) => {
    const newLimit = event.target.value as number;
    onPageLimitChange(newLimit);
  };

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl size="small" fullWidth disabled={disabled}>
        <InputLabel>Per Page</InputLabel>
        <Select
          value={pageLimit}
          label="Per Page"
          onChange={handleChange}
        >
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default PageLimitSelector;