import axios, { isAxiosError } from 'axios';
import { clearSessionToken, getSessionToken, setSessionToken } from './authSession';
import { apiUrl } from '../config/env';

export const API_BASE_URL = apiUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const PENDING_EXCHANGE_KEY = 'pendingAuthExchange';

export function stashAuthExchangeCode(code: string): void {
  try {
    sessionStorage.setItem(PENDING_EXCHANGE_KEY, code);
  } catch {
    // sessionStorage may be unavailable
  }
}

export function takePendingAuthExchangeCode(): string | null {
  try {
    const code = sessionStorage.getItem(PENDING_EXCHANGE_KEY);
    if (code) {
      sessionStorage.removeItem(PENDING_EXCHANGE_KEY);
    }
    return code;
  } catch {
    return null;
  }
}

export function clearPendingAuthExchangeCode(): void {
  try {
    sessionStorage.removeItem(PENDING_EXCHANGE_KEY);
  } catch {
    // sessionStorage may be unavailable
  }
}

export async function exchangeAuthCode(code: string) {
  const response = await apiClient.post('/api/auth/exchange', { code }, {
    validateStatus: (status) => status < 500,
  });

  // The exchange code is one-time: a definitive response (2xx success or 4xx
  // invalid) means it's spent, so drop the stash that survives a mid-exchange
  // refresh. Otherwise a later same-tab refresh replays the consumed code, the
  // server rejects it, and the caller wipes the valid 30-day session. A 5xx /
  // network error throws above this line, leaving the stash intact for retry.
  clearPendingAuthExchangeCode();

  if (response.status >= 400) {
    return {
      success: false,
      error: response.data?.error || 'Auth exchange failed',
      code: response.data?.code || 'EXCHANGE_FAILED',
    };
  }

  if (response.data?.success && response.data?.token) {
    setSessionToken(response.data.token);
  }

  return response.data;
}

export function isUnauthorizedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

export { clearSessionToken, getSessionToken, setSessionToken, isAxiosError };

export default apiClient;
