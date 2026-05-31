// Cờ Tướng Vương — ELO calculator
// Standard ELO. ELO khởi điểm 1200 (theo quyết định).
// Phase 1 chỉ tính local, Phase 2 sẽ sync server.

const STARTING = 1200;

const RANKS = [
  { min: 0,    name: 'tap_su',    icon: '🪵', color: '#b08968' },
  { min: 1000, name: 'tan_binh',  icon: '🥉', color: '#cd7f32' },
  { min: 1200, name: 'dong',      icon: '🟫', color: '#cd9b6e' },
  { min: 1400, name: 'bac',       icon: '🥈', color: '#c0c0c0' },
  { min: 1600, name: 'vang',      icon: '🥇', color: '#f4c430' },
  { min: 1800, name: 'bach_kim',  icon: '💎', color: '#00e5ff' },
  { min: 2000, name: 'cao_thu',   icon: '🛡️', color: '#b388ff' },
  { min: 2200, name: 'dai_su',    icon: '⚔️', color: '#ff6b9d' },
  { min: 2400, name: 'tong_su',   icon: '👑', color: '#e63946' },
];

export function getRank(elo) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (elo >= RANKS[i].min) return RANKS[i];
  }
  return RANKS[0];
}

export function expectedScore(myElo, opElo) {
  return 1 / (1 + Math.pow(10, (opElo - myElo) / 400));
}

/** K-factor:
 *   < 30 ván:    K = 40 (provisional)
 *   < 2200 ELO:  K = 24
 *   ≥ 2200:      K = 16
 */
export function kFactor(elo, gamesPlayed) {
  if (gamesPlayed < 30) return 40;
  if (elo < 2200) return 24;
  return 16;
}

/**
 * Tính ELO mới sau 1 ván.
 * @param myElo
 * @param opElo
 * @param result 1 = thắng, 0.5 = hoà, 0 = thua
 * @param gamesPlayed số ván đã chơi (trước trận này)
 * @returns { newElo, delta, k, expected }
 */
export function updateElo(myElo, opElo, result, gamesPlayed = 0) {
  const e = expectedScore(myElo, opElo);
  const k = kFactor(myElo, gamesPlayed);
  const delta = Math.round(k * (result - e));
  return { newElo: myElo + delta, delta, k, expected: e };
}

export function isProvisional(gamesPlayed) {
  return gamesPlayed < 10;
}

export const STARTING_ELO = STARTING;
export const ALL_RANKS = RANKS;
