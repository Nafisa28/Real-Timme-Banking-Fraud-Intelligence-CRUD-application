// Automatically resolves production backend URL when deployed (e.g. Vercel)
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:5000/api' : 'https://banking-fraud-backend.onrender.com/api');

let token = localStorage.getItem('token') || '';

export function setAuthToken(newToken) {
  token = newToken;
  if (newToken) localStorage.setItem('token', newToken);
  else localStorage.removeItem('token');
}

export function getAuthToken() {
  return token || localStorage.getItem('token');
}

export async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const authToken = getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // 35s timeout to allow Render free-tier cold-start wakeups on deployed environments
  const timeoutMs = options.timeout || (isLocalhost ? 10000 : 35000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Backend server is waking up or unreachable. Please wait 10 seconds and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createWebSocketConnection(onMessage, onStatusChange) {
  const wsUrl = import.meta.env.VITE_WS_URL || (isLocalhost ? 'ws://localhost:5000/ws' : 'wss://banking-fraud-backend.onrender.com/ws');
  let ws = null;
  let reconnectTimer = null;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (onStatusChange) onStatusChange(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (e) {}
    };

    ws.onclose = () => {
      if (onStatusChange) onStatusChange(false);
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      if (onStatusChange) onStatusChange(false);
      ws.close();
    };
  }

  connect();

  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) ws.close();
  };
}
