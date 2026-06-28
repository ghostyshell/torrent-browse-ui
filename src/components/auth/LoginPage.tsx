import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Container,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const error = urlParams.get('error');
  const emailError = urlParams.get('email_not_allowed');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'auth_failed':
        return 'Authentication failed. Please try again.';
      case 'session_failed':
        return 'Session creation failed. Please try again.';
      case 'callback_failed':
        return 'Authentication callback failed. Please try again.';
      default:
        return null;
    }
  };

  if (emailError) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            backgroundColor: 'background.paper',
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Access Restricted
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            Your email address is not in the allowlist. Please contact the administrator to be added.
          </Alert>
          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={login}
            sx={{
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              textTransform: 'none',
              backgroundColor: '#4285f4',
              '&:hover': {
                backgroundColor: '#357ae8',
              },
            }}
          >
            Try Different Account
          </Button>
        </Box>
      </Container>
    );
  }

  const handleGoogleLogin = () => {
    login();
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
          Torrent Search
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Sign in to access your favorites, saved links, and personalized settings
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {getErrorMessage(error)}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleLogin}
          sx={{
            py: 1.5,
            px: 4,
            fontSize: '1.1rem',
            textTransform: 'none',
            backgroundColor: '#4285f4',
            '&:hover': {
              backgroundColor: '#357ae8',
            },
          }}
        >
          Sign in with Google
        </Button>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Your account gives you access to favorites, saved links, and Real Debrid integration.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
