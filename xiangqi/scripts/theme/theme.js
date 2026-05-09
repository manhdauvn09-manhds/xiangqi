// Cờ Tướng Vương — theme module (dark / light / auto)
const STORAGE_KEY = 'xq_theme';
const subscribers = new Set();
let mode = 'dark';

function effective(m) {
  if (m === 'auto') {
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return m;
}

export function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  mode = saved || 'dark';
  apply();
  // theo dõi OS đổi
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (mode === 'auto') apply();
  });
}

export function get() { return mode; }
export function getEffective() { return effective(mode); }

export function set(next) {
  if (!['dark','light','auto'].includes(next)) return;
  mode = next;
  localStorage.setItem(STORAGE_KEY, mode);
  apply();
}

export function toggle() {
  // dark ↔ light (auto sẽ resolve về effective rồi nhảy ngược)
  const cur = effective(mode);
  set(cur === 'dark' ? 'light' : 'dark');
}

export function onChange(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function apply() {
  const eff = effective(mode);
  document.documentElement.setAttribute('data-theme', eff);
  subscribers.forEach(fn => {
    try { fn(eff, mode); } catch (e) { console.error(e); }
  });
}
