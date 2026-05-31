// Cờ Tướng Vương — Transposition Table
// Map<bigint, entry> với LRU đơn giản: khi đầy, drop ngẫu nhiên 25%.

const MAX_ENTRIES = 200000;

export const TT_FLAG = Object.freeze({ EXACT: 0, LOWER: 1, UPPER: 2 });

export class TT {
  constructor() {
    this.map = new Map();
  }

  get(hash) {
    return this.map.get(hash) || null;
  }

  put(hash, depth, score, flag, bestMove) {
    if (this.map.size >= MAX_ENTRIES) {
      // drop random 25%
      let dropCount = Math.floor(MAX_ENTRIES * 0.25);
      for (const k of this.map.keys()) {
        this.map.delete(k);
        if (--dropCount <= 0) break;
      }
    }
    this.map.set(hash, { depth, score, flag, bestMove });
  }

  clear() { this.map.clear(); }

  size() { return this.map.size; }
}
