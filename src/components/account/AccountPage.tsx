import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Avatar,
  Divider,
  Alert,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  AccountCircle,
  VpnKey,
  Logout,
  Delete,
  Visibility,
  VisibilityOff,
  Save,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const AccountPage: React.FC = () => {
  const { user, logout, saveRealDebridKey, removeRealDebridKey } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [removeKeyDialogOpen, setRemoveKeyDialogOpen] = useState(false);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter a valid API key');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const success = await saveRealDebridKey(apiKey);
      if (success) {
        setSuccess('Real Debrid API key saved successfully!');
        setApiKey('');
      } else {
        setError('Failed to save API key. Please try again.');
      }
    } catch (error) {
      setError('An error occurred while saving the API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const success = await removeRealDebridKey();
      if (success) {
        setSuccess('Real Debrid API key removed successfully!');
        setRemoveKeyDialogOpen(false);
      } else {
        setError('Failed to remove API key. Please try again.');
      }
    } catch (error) {
      setError('An error occurred while removing the API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLogoutDialogOpen(false);
  };

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountCircle />
        Account Settings
      </Typography>

      {/* User Profile Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile Information
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar src={user.picture} sx={{ width: 60, height: 60 }}>
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6">{user.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Button
          variant="outlined"
          color="error"
          startIcon={<Logout />}
          onClick={() => setLogoutDialogOpen(true)}
        >
          Sign Out
        </Button>
      </Paper>

      {/* Real Debrid API Key Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKey />
            Real Debrid API Key
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure your Real Debrid API key to enable premium streaming features.
            Your API key is stored securely and encrypted.
          </Typography>

          {user.hasRealDebridKey ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Real Debrid API key is configured. All streaming operations will use your premium account.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No Real Debrid API key configured. Add one to enable premium streaming features.
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Real Debrid API Key"
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Real Debrid API key"
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowApiKey(!showApiKey)}
                  edge="end"
                >
                  {showApiKey ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveApiKey}
              disabled={loading || !apiKey.trim()}
            >
              {user.hasRealDebridKey ? 'Update API Key' : 'Save API Key'}
            </Button>

            {user.hasRealDebridKey && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setRemoveKeyDialogOpen(true)}
                disabled={loading}
              >
                Remove API Key
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* How to get API Key Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          How to get your Real Debrid API Key
        </Typography>

        <Typography variant="body2" component="div" sx={{ '& ol': { pl: 2 }, '& li': { mb: 1 } }}>
          <ol>
            <li>Go to <a href="https://real-debrid.com/apitoken" target="_blank" rel="noopener noreferrer">Real Debrid API Token page</a></li>
            <li>Sign in to your Real Debrid account</li>
            <li>Copy your API token</li>
            <li>Paste it in the field above and click "Save API Key"</li>
          </ol>
        </Typography>

        <Alert severity="warning" sx={{ mt: 2 }}>
          Keep your API key secure! Never share it with others. It provides full access to your Real Debrid account.
        </Alert>
      </Paper>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
        <DialogTitle>Confirm Sign Out</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to sign out? You'll need to sign in again to access your saved data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleLogout} color="error" variant="contained">
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove API Key Confirmation Dialog */}
      <Dialog open={removeKeyDialogOpen} onClose={() => setRemoveKeyDialogOpen(false)}>
        <DialogTitle>Remove Real Debrid API Key</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove your Real Debrid API key?
            This will disable all premium streaming features.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveKeyDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRemoveApiKey} color="error" variant="contained" disabled={loading}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountPage;