// Cờ Tướng Vương — biến thể Cờ Úp (Blind Xiangqi)
// Luật chốt: xáo random toàn bộ 30 quân (trừ 2 Tướng), Tướng giữ nguyên cung trung tâm.
// Quân úp xuống (hidden=true), khi đến lượt người chơi có thể:
//   1. Lật 1 quân úp bất kỳ trên bàn (revealing).
//   2. Đi 1 quân đã lật của mình theo luật cờ tướng chuẩn.
import { BOARD_W, BOARD_H, INITIAL_FEN } from '../core/constants.js';
import { fromFEN, applyMove as baseApplyMove, undoMove as baseUndoMove } from '../core/board.js';
import { movesForPiece } from '../core/moves.js';
import { isCheck, isFacingGenerals } from '../core/rules.js';

/** Mulberry32 PRNG để xáo deterministic theo seed. */
function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Xáo Fisher-Yates với PRNG cho trước. */
function shuffle(arr, prng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tạo board cờ úp với seed cho trước.
 * Tướng giữ nguyên ở (4,9) Đỏ và (4,0) Đen, công khai.
 * 30 quân còn lại bị xáo và úp xuống (hidden=true).
 */
export function createBlindBoard(seed) {
  const board = fromFEN(INITIAL_FEN, 'blind');
  // Thu thập 30 quân không phải Tướng + vị trí gốc
  const positions = [];
  const pool = [];
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p || p.type === 'K') continue;
      positions.push({ f, r });
      pool.push({ type: p.type, side: p.side });
    }
  }
  // Xáo
  const prng = mulberry32(seed);
  const shuffled = shuffle(pool, prng);
  // Đặt lại + đánh dấu hidden
  for (let i = 0; i < positions.length; i++) {
    const { f, r } = positions[i];
    board.squares[f][r] = { ...shuffled[i], hidden: true };
  }
  // Tướng vẫn lộ
  return board;
}

/** Sinh seed ngẫu nhiên (32-bit). */
export function genSeed() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

/** Hash SHA-256 (hex) — dùng để commit seed đầu ván. */
export async function hashSeed(seed) {
  if (typeof crypto === 'undefined' || !crypto.subtle) return String(seed);
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(String(seed)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

/**
 * Sinh nước đi cho cờ úp.
 * Bao gồm:
 *  - "reveal" moves: lật 1 quân úp (đánh dấu .reveal = true, .from = .to = ô đó)
 *  - normal moves cho quân ĐÃ LẬT thuộc bên `side`
 */
export function generateBlindLegalMoves(board, side) {
  const out = [];
  // Reveal moves — bất kỳ quân úp nào trên bàn
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (p && p.hidden) {
        out.push({ from: { file: f, rank: r }, to: { file: f, rank: r }, reveal: true });
      }
    }
  }
  // Move moves — chỉ quân đã lật của side mình
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p || p.hidden) continue;
      if (p.side !== side) continue;
      const ms = movesForPiece(board, f, r);
      for (const m of ms) {
        // Test legality (Tướng mình không bị chiếu, không lộ tướng)
        baseApplyMove(board, m);
        const movedSide = side;
        const ok = !isCheck(board, movedSide) && !isFacingGenerals(board);
        baseUndoMove(board);
        if (ok) out.push(m);
      }
    }
  }
  return out;
}

/** Apply move cho cờ úp. Nếu là reveal, chỉ flip rồi đổi lượt. */
export function applyBlindMove(board, move) {
  if (move.reveal) {
    const p = board.squares[move.to.file][move.to.rank];
    if (!p || !p.hidden) throw new Error('reveal: ô không có quân úp');
    p.hidden = false;
    // Lưu vào history
    board.history.push({
      from: { ...move.from },
      to:   { ...move.to },
      piece: { ...p },
      captured: null,
      reveal: true,
    });
    board.side = board.side === 'r' ? 'b' : 'r';
    if (board.side === 'r') board.fullmove += 1;
    board.halfmoveSinceCapture += 1;
    return null;
  }
  return baseApplyMove(board, move);
}

export function undoBlindMove(board) {
  const m = board.history[board.history.length - 1];
  if (!m) return null;
  if (m.reveal) {
    board.history.pop();
    const p = board.squares[m.to.file][m.to.rank];
    if (p) p.hidden = true;
    board.side = board.side === 'r' ? 'b' : 'r';
    if (board.side === 'b') board.fullmove -= 1;
    if (board.halfmoveSinceCapture > 0) board.halfmoveSinceCapture -= 1;
    return m;
  }
  return baseUndoMove(board);
}
