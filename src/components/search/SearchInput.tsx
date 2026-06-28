import React from 'react';
import { TextField } from '@mui/material';

interface SearchInputProps {
  query: string;
  onChange: (query: string) => void;
  onKeyPress: (event: React.KeyboardEvent) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({
  query,
  onChange,
  onKeyPress,
}) => {
  return (
    <TextField
      sx={{ flexGrow: 1, minWidth: 300 }}
      label='Search Query'
      variant='outlined'
      value={query}
      onChange={(e) => onChange(e.target.value)}
      onKeyPress={onKeyPress}
      placeholder='Optional: leave empty to use common search preset'
    />
  );
};

export default SearchInput;
