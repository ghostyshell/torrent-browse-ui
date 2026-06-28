import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { realDebridKeyManager } from '../services/realDebridKeyManager';
import apiClient, {
  clearSessionToken,
  exchangeAuthCode,
  isAxiosError,
  stashAuthExchangeCode,
  takePendingAuthExchangeCode,
} from '../services/apiClient';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  hasRealDebridKey: boolean;
  isEmailAllowed: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (redirectUrl?: string) => void;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  saveRealDebridKey: (apiKey: string) => Promise<boolean>;
  removeRealDebridKey: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function readAuthExchangeCode(): string | null {
  const pending = takePendingAuthExchangeCode();
  if (pending) return pending;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('auth_exchange');
  if (!code) return null;

  stashAuthExchangeCode(code);

  params.delete('auth_exchange');
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${
    nextSearch ? `?${nextSearch}` : ''
  }${window.location.hash}`;
  window.history.replaceState({}, document.title, nextUrl);

  return code;
}

function applyUser(
  nextUser: User,
  setUser: React.Dispatch<React.SetStateAction<User | null>>
): void {
  if (!nextUser.isEmailAllowed) {
    setUser(null);
    realDebridKeyManager.clear();
    throw new Error(
      'Email not authorized. Please contact admin to be added to the allowlist.'
    );
  }

  setUser(nextUser);
  realDebridKeyManager.initialize(nextUser.hasRealDebridKey);
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initStartedRef = useRef(false);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const initializeAuth = async () => {
      try {
        const exchangeCode = readAuthExchangeCode();
        if (exchangeCode) {
          const exchangeResult = await exchangeAuthCode(exchangeCode);
          if (exchangeResult?.success && exchangeResult.user) {
            applyUser(exchangeResult.user, setUser);
            return;
          }

          console.warn(
            'Auth exchange failed:',
            exchangeResult?.error || 'Unknown error'
          );
          clearSessionToken();
          setUser(null);
          realDebridKeyManager.clear();
          return;
        }

        await validateAndSetUser();
      } catch (error) {
        // Only a real invalid/missing session (401) should destroy the stored
        // token. Transient failures (network error, 5xx, a store that is
        // briefly unavailable right after a backend redeploy) must NOT wipe the
        // 30-day cookie, or a single blip logs the user out on refresh and
        // forces a full Google re-login. Keep the token so the next refresh
        // recovers.
        if (isAxiosError(error)) {
          console.error('Auth initialization transient error:', error);
          setUser(null);
        } else {
          // Non-axios throw (e.g. disallowed email from applyUser): log out.
          console.error('Auth initialization error:', error);
          setUser(null);
          clearSessionToken();
          realDebridKeyManager.clear();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const validateAndSetUser = async () => {
    const response = await apiClient.post('/api/auth/validate', {}, {
      validateStatus: (status) => status < 500,
    });

    if (response.status === 401) {
      clearSessionToken();
      setUser(null);
      realDebridKeyManager.clear();
      return;
    }

    if (response.data?.success && response.data.user) {
      applyUser(response.data.user, setUser);
      return;
    }

    // Unexpected non-success that isn't a real 401 (e.g. 429, or a 503 store
    // blip that slipped through). Keep the token; treat as logged-out for this
    // render so a refresh retries instead of destroying the session.
    setUser(null);
  };

  const login = (redirectUrl?: string) => {
    const currentUrl = redirectUrl || window.location.href;
    const loginUrl = `${apiClient.defaults.baseURL}/api/auth/google?state=${encodeURIComponent(
      currentUrl
    )}`;
    window.location.href = loginUrl;
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      clearSessionToken();
      realDebridKeyManager.clear();
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const saveRealDebridKey = async (apiKey: string): Promise<boolean> => {
    try {
      const response = await apiClient.post('/api/auth/realdebrid/api-key', {
        apiKey,
      });

      if (response.data.success) {
        updateUser({ hasRealDebridKey: true });
        realDebridKeyManager.initialize(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error saving Real Debrid API key:', error);
      return false;
    }
  };

  const removeRealDebridKey = async (): Promise<boolean> => {
    try {
      const response = await apiClient.delete('/api/auth/realdebrid/api-key');

      if (response.data.success) {
        updateUser({ hasRealDebridKey: false });
        realDebridKeyManager.clear();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error removing Real Debrid API key:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    saveRealDebridKey,
    removeRealDebridKey,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
