import React from 'react';
import { Box, Pagination as MuiPagination, Typography } from '@mui/material';

interface PaginationProps {
  currentPage: number;
  totalResults: number;
  resultsPerPage?: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalResults,
  resultsPerPage = 50, // Typical number of results per page for torrent sites
  onPageChange,
  loading = false,
}) => {
  // For torrent sites, we don't know the exact total pages, so we show a reasonable range
  // Allow pagination up to current page + 10
  const maxPage = currentPage + 10;

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {

    if (page !== currentPage && !loading) {

      onPageChange(page);
    } else {

    }
  };

  if (totalResults === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        py: 2,
        gap: 2,
      }}>
      <Typography variant='body2' color='text.secondary'>
        Page {currentPage} • {totalResults} results
      </Typography>
      <MuiPagination
        count={maxPage}
        page={currentPage}
        onChange={handlePageChange}
        color='primary'
        disabled={loading}
        showFirstButton={currentPage > 1}
        showLastButton={false}
        hidePrevButton={false} // Always show previous button
        siblingCount={2}
        boundaryCount={1}
      />
    </Box>
  );
};

export default Pagination;
