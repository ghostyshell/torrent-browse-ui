import { useEffect, useState } from 'react';
import { realDebridKeyManager } from '../services/realDebridKeyManager';
import { realDebridService } from '../services/realDebridService';
import { useAuth } from '../contexts/AuthContext';

export const useRealDebridService = () => {
  const { user, isAuthenticated } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      realDebridKeyManager.clear();
      setIsConfigured(false);
      setIsInitialized(true);
      return;
    }

    realDebridKeyManager.initialize(user.hasRealDebridKey);
    setIsConfigured(realDebridService.isConfigured());
    setIsInitialized(true);
  }, [isAuthenticated, user?.hasRealDebridKey, user?.id]);

  return {
    isInitialized,
    isConfigured,
    realDebridService,
  };
};
