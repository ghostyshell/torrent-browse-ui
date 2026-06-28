import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface MinimumSeedersSelectorProps {
  minSeeders: number;
  onChange: (value: number) => void;
}

const MinimumSeedersSelector: React.FC<MinimumSeedersSelectorProps> = ({
  minSeeders,
  onChange,
}) => {
  const seedersOptions = [
    { value: 0, label: 'Any' },
    { value: 1, label: '1+' },
    { value: 5, label: '5+' },
    { value: 10, label: '10+' },
    { value: 25, label: '25+' },
    { value: 50, label: '50+' },
    { value: 100, label: '100+' },
  ];

  return (
    <FormControl variant='outlined' sx={{ minWidth: 120 }}>
      <InputLabel id='min-seeders-label'>Min Seeders</InputLabel>
      <Select
        labelId='min-seeders-label'
        value={minSeeders}
        onChange={(e) => onChange(Number(e.target.value))}
        label='Min Seeders'
        size='small'>
        {seedersOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default MinimumSeedersSelector;
