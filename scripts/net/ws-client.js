// Cờ Tướng Vương — WebSocket client
import { API_BASE, getToken } from './api.js';

const WS_URL = API_BASE.replace(/^http/, 'ws') + '/ws';

let ws = null;
let connected = false;
let pendingAuth = null;
const handlers = new Map();           // type → Set<fn>
const reconnectMs = 2000;
let intentionalClose = false;
let heartbeatTimer = null;

export function on(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
  return () => handlers.get(type)?.delete(fn);
}

function emit(type, payload) {
  handlers.get(type)?.forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } });
  handlers.get('*')?.forEach(fn => { try { fn(type, payload); } catch (e) {} });
}

export function isConnected() { return connected; }

export async function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return new Promise(r => { if (connected) r(true); else pendingAuth = r; });
  }
  const token = getToken();
  if (!token) throw new Error('not_authed');
  intentionalClose = false;
  ws = new WebSocket(WS_URL);

  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
    });
    ws.addEventListener('message', (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'ready') {
        connected = true;
        startHeartbeat();
        if (pendingAuth) { pendingAuth(true); pendingAuth = null; }
        resolve(true);
        return;
      }
      emit(m.type, m);
    });
    ws.addEventListener('error', (e) => {
      if (!connected) reject(new Error('ws_error'));
    });
    ws.addEventListener('close', (e) => {
      const wasConnected = connected;
      connected = false;
      stopHeartbeat();
      if (!intentionalClose && wasConnected) {
        emit('disconnected', { code: e.code });
        // Auto-reconnect
        setTimeout(() => connect().catch(() => {}), reconnectMs);
      }
    });
  });
}

export function disconnect() {
  intentionalClose = true;
  if (ws) ws.close();
  ws = null;
  connected = false;
}

export function send(type, payload = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[ws] not open, drop', type);
    return false;
  }
  ws.send(JSON.stringify({ type, ...payload }));
  return true;
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => send('presence.heartbeat'), 25000);
}
function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}
