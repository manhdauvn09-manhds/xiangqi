// Cờ Tướng Vương — REST API client
// Detect API base từ <meta name="xq-api-base"> hoặc fallback localhost:8787

const META = document.querySelector('meta[name="xq-api-base"]');
export const API_BASE = (META?.content || 'http://127.0.0.1:8787').replace(/\/$/, '');

const KEY_TOKEN = 'xq_jwt';

let _token = localStorage.getItem(KEY_TOKEN) || null;
let _user = null;
const _subs = new Set();

export function getToken() { return _token; }
export function getUser() { return _user; }
export function isAuthed() { return !!_token; }

export function onAuthChange(fn) {
  _subs.add(fn);
  return () => _subs.delete(fn);
}

function _emit() { _subs.forEach(fn => { try { fn(_user); } catch {} }); }

function _setToken(token, user = null) {
  _token = token;
  _user = user;
  if (token) localStorage.setItem(KEY_TOKEN, token);
  else localStorage.removeItem(KEY_TOKEN);
  _emit();
}

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { data = await res.json(); } catch {}
  } else {
    try { data = await res.text(); } catch {}
  }
  if (!res.ok) {
    const err = new Error(data?.detail || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ─────────────── Auth ───────────────
export async function register({ email, password, displayName }) {
  const r = await request('/api/auth/register', {
    method: 'POST',
    body: { email, password, display_name: displayName },
  });
  _setToken(r.jwt, r.user);
  return r;
}

export async function login({ email, password }) {
  const r = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  _setToken(r.jwt, r.user);
  return r;
}

export async function googleSignIn({ idToken }) {
  const r = await request('/api/auth/google', {
    method: 'POST',
    body: { id_token: idToken },
  });
  _setToken(r.jwt, r.user);
  return r;
}

export async function logout() {
  try { await request('/api/auth/logout', { method: 'POST' }); } catch {}
  _setToken(null, null);
}

/** Gọi sau khi load token cũ — verify còn valid không. */
export async function loadMe() {
  if (!_token) return null;
  try {
    const r = await request('/api/me');
    _user = r.user;
    _emit();
    return r;
  } catch (e) {
    if (e.status === 401) _setToken(null, null);
    return null;
  }
}

// ─────────────── User ───────────────
export const me = {
  get: () => request('/api/me'),
  patch: (body) => request('/api/me', { method: 'PATCH', body }),
};

// ─────────────── Games ───────────────
export const games = {
  list: (limit = 50) => request(`/api/games?limit=${limit}`),
  get: (id) => request(`/api/games/${id}`),
  save: (body) => request('/api/games', { method: 'POST', body }),
};

// ─────────────── ELO + Leaderboard ───────────────
export const ratings = {
  ofUser: (uid, variant = 'standard') => request(`/api/elo/${uid}?variant=${variant}`),
  leaderboard: (variant = 'standard', limit = 100) =>
    request(`/api/leaderboard?variant=${variant}&limit=${limit}`),
};

// ─────────────── Daily ───────────────
export const daily = {
  get: () => request('/api/daily'),
  attempt: (body) => request('/api/daily/attempt', { method: 'POST', body }),
};

// ─────────────── Super AI ───────────────
export const superAi = {
  quota: () => request('/api/super-ai/quota'),
  start: () => request('/api/super-ai/start', { method: 'POST' }),
};

// ─────────────── Challenges (custom rooms) ───────────────
export const challenges = {
  create: (body) => request('/api/challenges', { method: 'POST', body }),
  lookup: (code) => request(`/api/challenges/${code}`),
  join: (code, password = null) => request(`/api/challenges/${code}/join`, {
    method: 'POST',
    body: { password },
  }),
};

// Auto-load me() when this module loads if we have a token
if (_token) {
  loadMe();  // fire-and-forget
}
