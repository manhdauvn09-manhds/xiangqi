// Cờ Tướng Vương — Zobrist hashing để key cho transposition table
import { BOARD_W, BOARD_H } from './constants.js';

// 14 piece types (7 × 2 sides) × 90 squares = 1260 random keys
// Plus 1 key cho side to move

const PIECE_INDEX = {
  Kr:0, Ar:1, Er:2, Hr:3, Rr:4, Cr:5, Pr:6,
  Kb:7, Ab:8, Eb:9, Hb:10, Rb:11, Cb:12, Pb:13,
};

let TABLE = null;
let SIDE_KEY = 0n;

function rand64() {
  // 64-bit random từ 4× 16-bit (Math.random ko đủ entropy nhưng đủ cho TT)
  const buf = new BigUint64Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    buf[0] = BigInt(Math.floor(Math.random() * 0xffffffff)) << 32n
           | BigInt(Math.floor(Math.random() * 0xffffffff));
  }
  return buf[0];
}

export function initZobrist() {
  if (TABLE) return;
  TABLE = new Array(14 * BOARD_W * BOARD_H);
  for (let i = 0; i < TABLE.length; i++) TABLE[i] = rand64();
  SIDE_KEY = rand64();
}

function keyAt(piece, file, rank) {
  const code = (piece.type + piece.side);
  const idx = PIECE_INDEX[code] * (BOARD_W * BOARD_H) + (file * BOARD_H + rank);
  return TABLE[idx];
}

/** Hash toàn bàn cờ (chậm hơn — chỉ dùng init). */
export function hashBoard(board) {
  initZobrist();
  let h = 0n;
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p) continue;
      h ^= keyAt(p, f, r);
    }
  }
  if (board.side === 'b') h ^= SIDE_KEY;
  return h;
}

/** Cập nhật incremental hash sau 1 nước. piece là quân đi, captured (nếu có). */
export function applyMoveHash(prevHash, piece, captured, from, to) {
  initZobrist();
  let h = prevHash;
  h ^= keyAt(piece, from.file, from.rank);
  h ^= keyAt(piece, to.file,   to.rank);
  if (captured) h ^= keyAt(captured, to.file, to.rank);
  h ^= SIDE_KEY;
  return h;
}
