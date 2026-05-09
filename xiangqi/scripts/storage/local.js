// Cờ Tướng Vương — localStorage helpers
const PROFILE_KEY = 'xq_profile';
const HISTORY_KEY = 'xq_history';
const SETTINGS_KEY = 'xq_settings';

import { STARTING_ELO } from '../elo/elo.js';

export function getProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile();
    return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch { return defaultProfile(); }
}

export function setProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function defaultProfile() {
  return {
    name: 'Bạn',
    elo: STARTING_ELO,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    createdAt: Date.now(),
  };
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch { return defaultSettings(); }
}

export function setSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function defaultSettings() {
  return {
    notation: 'vn',          // 'vn' | 'iccs'
    sound: true,
    hint: false,
    lastBotLevel: 3,
    lastSide: 'r',           // 'r' = bạn cầm Đỏ
  };
}

/** Append game record to history. Giới hạn 200 ván local. */
export function appendGame(game) {
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { arr = []; }
  arr.unshift(game);
  if (arr.length > 200) arr = arr.slice(0, 200);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}

export function listGames(limit = 50) {
  try {
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return arr.slice(0, limit);
  } catch { return []; }
}
