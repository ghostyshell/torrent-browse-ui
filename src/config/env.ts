declare global {
  interface Window {
    __ENV__?: { REACT_APP_API_URL?: string; REACT_APP_BACKEND_URL?: string };
  }
}

const w = window.__ENV__ ?? {};

export const backendUrl: string =
  w.REACT_APP_BACKEND_URL ||
  w.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3001';

export const apiUrl: string =
  w.REACT_APP_API_URL ||
  w.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  'http://localhost:3001';
