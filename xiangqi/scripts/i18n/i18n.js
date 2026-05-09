// Cờ Tướng Vương — i18n core
// Đơn giản, không phụ thuộc framework. Hỗ trợ vi (mặc định) + en.
// `?v=` bust browser HTTP cache khi locale tăng số version. Bump khi thêm key.

import vi from './locales/vi.js?v=20260508d';
import en from './locales/en.js?v=20260508d';

const LOCALES = { vi, en };
const SUPPORTED = ['vi', 'en'];
const STORAGE_KEY = 'xq_lang';

let currentLang = 'vi';
const subscribers = new Set();

/** Phát hiện ngôn ngữ ưu tiên: localStorage → navigator → 'vi' */
export function detectLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) return saved;
  const nav = (navigator.language || 'vi').toLowerCase();
  if (nav.startsWith('vi')) return 'vi';
  return 'en';
}

export function init(opts = {}) {
  currentLang = opts.lang || detectLang();
  applyToDocument();
}

export function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  if (lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyToDocument();
  subscribers.forEach(fn => {
    try { fn(lang); } catch (e) { console.error(e); }
  });
}

export function getLang() {
  return currentLang;
}

export function onChange(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** Translate. Hỗ trợ placeholder dạng {name}. */
export function t(key, params) {
  const dict = LOCALES[currentLang] || LOCALES.vi;
  let s = dict[key];
  if (s === undefined) {
    // fallback to en
    s = LOCALES.en[key];
    if (s === undefined) {
      console.warn('[i18n] missing key:', key);
      return key;
    }
  }
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
  }
  return s;
}

/** Áp dụng dịch cho toàn bộ DOM:
 *   <element data-i18n="key">…</element>          → đặt textContent
 *   <element data-i18n-attr="title:key,placeholder:key2">  → đặt attribute
 */
export function applyToDocument(root = document) {
  document.documentElement.setAttribute('lang', currentLang);
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const spec = el.dataset.i18nAttr;
    spec.split(',').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}
