const SESSION_KEY = 'sessionToken';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function cookieGet(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function cookieSet(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Strict`;
}

function cookieClear(name: string): void {
  document.cookie = `${name}=; max-age=0; path=/; SameSite=Strict`;
}

export function getSessionToken(): string | null {
  // Fall back to sessionStorage for tokens set before this change.
  return cookieGet(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token: string): void {
  cookieSet(SESSION_KEY, token);
  // Remove any stale sessionStorage entry.
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function clearSessionToken(): void {
  cookieClear(SESSION_KEY);
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function getAuthHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getSessionToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
