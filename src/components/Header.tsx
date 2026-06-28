import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Badge,
  useMediaQuery,
  useTheme,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  Home as HomeIcon,
  Link as LinkIcon,
  AccountCircle,
  Settings,
  Logout,
  Login,
  Waves as WavesIcon,
} from '@mui/icons-material';
import { favoritesService } from '../services/favoritesService';
import { storedLinksService } from '../services/storedLinksService';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  currentView: 'home' | 'search' | 'favorites' | 'cached-links';
  onViewChange: (view: 'home' | 'search' | 'favorites' | 'cached-links') => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, logout } = useAuth();
  const [favoritesCount, setFavoritesCount] = React.useState(0);
  const [cachedLinksCount, setCachedLinksCount] = React.useState(0);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const updateCounts = React.useCallback(async () => {
    const favCount = await favoritesService.getFavoritesCount();
    setFavoritesCount(favCount);
    setCachedLinksCount(storedLinksService.getStoredLinksCountSync());
  }, []);

  // Update counts periodically but less frequently to prevent API stampede
  React.useEffect(() => {
    updateCounts();

    // Update counts every 30 seconds instead of every second to reduce API calls
    const interval = setInterval(updateCounts, 30000);
    return () => clearInterval(interval);
  }, [updateCounts]);

  // Update counts immediately when switching to favorites view
  React.useEffect(() => {
    if (currentView === 'favorites') {
      updateCounts();
    }
  }, [currentView, updateCounts]);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleGoToAccount = () => {
    navigate('/account');
    handleProfileMenuClose();
  };

  const handleLogout = async () => {
    await logout();
    handleProfileMenuClose();
    navigate('/');
  };

  const handleLogin = () => {
    login();
  };

  return (
    <AppBar position='static' elevation={2}>
      <Toolbar
        sx={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          minHeight: isMobile ? 'auto' : '64px',
          py: isMobile ? 2 : 1,
          px: isSmallScreen ? 1 : 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexGrow: isMobile ? 0 : 1,
            justifyContent: isMobile ? 'center' : 'flex-start',
            mb: isMobile ? 2 : 0,
          }}
        >
          <WavesIcon sx={{ color: 'primary.light', fontSize: 28 }} />
          <Typography
            variant='h6'
            component='div'
            sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}
          >
            Torrent Search
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 1 : 1,
            width: isMobile ? '100%' : 'auto',
            alignItems: isMobile ? 'stretch' : 'center'
          }}
        >
          <Button
            color={currentView === 'home' ? 'primary' : 'inherit'}
            startIcon={<HomeIcon />}
            onClick={() => {
              navigate({ pathname: '/', search: '' });
              onViewChange('home');
            }}
            variant={currentView === 'home' ? 'contained' : 'text'}
            sx={{
              justifyContent: isMobile ? 'flex-start' : 'center',
              minHeight: 40,
              ...(currentView !== 'home' && {
                color: 'text.primary',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
              }),
            }}
          >
            Home
          </Button>

          <Button
            color={currentView === 'favorites' ? 'primary' : 'inherit'}
            startIcon={
              <Badge badgeContent={favoritesCount} color='error' max={99}>
                <FavoriteIcon />
              </Badge>
            }
            onClick={() => {
              navigate('/favorites');
              onViewChange('favorites');
            }}
            variant={currentView === 'favorites' ? 'contained' : 'text'}
            sx={{
              justifyContent: isMobile ? 'flex-start' : 'center',
              minHeight: 40,
              ...(currentView !== 'favorites' && {
                color: 'text.primary',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
              }),
            }}
          >
            Favorites
          </Button>

          <Button
            color={currentView === 'cached-links' ? 'primary' : 'inherit'}
            startIcon={
              <Badge badgeContent={cachedLinksCount} color='info' max={99}>
                <LinkIcon />
              </Badge>
            }
            onClick={() => {
              navigate('/cached-links');
              onViewChange('cached-links');
            }}
            variant={currentView === 'cached-links' ? 'contained' : 'text'}
            sx={{
              justifyContent: isMobile ? 'flex-start' : 'center',
              minHeight: 40,
              ...(currentView !== 'cached-links' && {
                color: 'text.primary',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
              }),
            }}
          >
            Cached Links
          </Button>

          {/* User Authentication Section */}
          {isAuthenticated ? (
            <>
              <IconButton
                onClick={handleProfileMenuOpen}
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="profile-menu"
                aria-haspopup="true"
                sx={{ ml: 1 }}
              >
                <Avatar
                  src={user?.picture}
                  sx={{ width: 32, height: 32 }}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                id="profile-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
              >
                <MenuItem disabled>
                  <ListItemIcon>
                    <AccountCircle />
                  </ListItemIcon>
                  <ListItemText
                    primary={user?.name}
                    secondary={user?.email}
                  />
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleGoToAccount}>
                  <ListItemIcon>
                    <Settings />
                  </ListItemIcon>
                  <ListItemText primary="Account Settings" />
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout />
                  </ListItemIcon>
                  <ListItemText primary="Sign Out" />
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              color="inherit"
              startIcon={<Login />}
              onClick={handleLogin}
              variant="outlined"
              sx={{
                color: 'text.primary',
                borderColor: 'rgba(255,255,255,0.20)',
                ml: 1,
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.40)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              Sign In
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
