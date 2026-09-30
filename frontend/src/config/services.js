const trimTrailingSlash = (url) => url.replace(/\/+$/, '');

export const API_BASE = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
);

export const NOWCAST_BASE = trimTrailingSlash(
  import.meta.env.VITE_STORMAI_BASE_URL || 'http://localhost:8001',
);

// Render terminates TLS, so the browser must use secure WebSockets in production.
export const LIVE_WS_URL = import.meta.env.VITE_LIVE_WS_URL
  || `${API_BASE.replace(/^http/, 'ws')}/ws/live`;
