// Uses VITE_API_URL in production (set in Vercel env vars to point to Render backend)
// Falls back to localhost for local development
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

export function createWebSocketConnection(onMessage, onStatusChange) {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
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
