import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface WebsiteSelectorProps {
  website: string;
  availableWebsites: string[];
  onChange: (website: string) => void;
}

const WebsiteSelector: React.FC<WebsiteSelectorProps> = ({
  website,
  availableWebsites,
  onChange,
}) => {
  return (
    <FormControl sx={{ minWidth: 120 }}>
      <InputLabel>Website</InputLabel>
      <Select
        value={website}
        label='Website'
        onChange={(e) => onChange(e.target.value)}>
        {availableWebsites.map((site) => (
          <MenuItem key={site} value={site}>
            {site === 'all'
              ? 'All Sources'
              : site.charAt(0).toUpperCase() + site.slice(1)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default WebsiteSelector;
