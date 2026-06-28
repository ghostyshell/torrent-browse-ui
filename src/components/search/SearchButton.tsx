import React from 'react';
import { Button } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface SearchButtonProps {
  onClick: () => void;
}

const SearchButton: React.FC<SearchButtonProps> = ({ onClick }) => {
  return (
    <Button
      variant='contained'
      size='large'
      startIcon={<SearchIcon />}
      onClick={onClick}
      sx={{ px: 3 }}>
      Search
    </Button>
  );
};

export default SearchButton;
