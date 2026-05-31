// Cờ Tướng Vương — sinh nước đi cho từng quân
// Chỉ sinh "pseudo-legal" moves (chưa kiểm tra để Tướng bị chiếu).
// Việc lọc legal được làm trong rules.js.

import { BOARD_W, BOARD_H, OPP, inBoard, inPalace, acrossRiver } from './constants.js';
import { pieceAt } from './board.js';

/** Helper: thử thêm 1 nước đến (tf, tr) nếu hợp lệ. Trả true nếu là quân địch (block đường). */
function tryAdd(board, list, fromF, fromR, tf, tr, side) {
  if (!inBoard(tf, tr)) return null;
  const target = pieceAt(board, tf, tr);
  if (target && target.side === side) return 'self';   // chặn đường
  list.push({ from: { file: fromF, rank: fromR }, to: { file: tf, rank: tr } });
  return target ? 'capture' : 'empty';
}

// ────────────────────────────────────────────────────────────
// Tướng (General) — đi 1 ô dọc/ngang trong cung
// ────────────────────────────────────────────────────────────
export function generalMoves(board, f, r, side) {
  const moves = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [df, dr] of dirs) {
    const nf = f + df, nr = r + dr;
    if (!inPalace(nf, nr, side)) continue;
    const t = pieceAt(board, nf, nr);
    if (t && t.side === side) continue;
    moves.push({ from:{file:f,rank:r}, to:{file:nf,rank:nr} });
  }
  // Đặc biệt: "Tướng bay" — Tướng có thể "ăn" Tướng đối phương khi 2 Tướng cùng cột,
  // không có quân nào chen giữa. Nước này không được phép thực hiện (lộ tướng) NHƯNG
  // ta vẫn sinh vì sẽ bị filter ở isLegal — và nó dùng để kiểm tra check.
  // Tìm Tướng địch trên cùng file
  for (let rr = 0; rr < BOARD_H; rr++) {
    if (rr === r) continue;
    const p = pieceAt(board, f, rr);
    if (!p) continue;
    if (p.type === 'K' && p.side !== side) {
      // có phải toàn ô trống giữa không?
      const lo = Math.min(r, rr) + 1;
      const hi = Math.max(r, rr) - 1;
      let blocked = false;
      for (let k = lo; k <= hi; k++) {
        if (pieceAt(board, f, k)) { blocked = true; break; }
      }
      if (!blocked) {
        moves.push({ from:{file:f,rank:r}, to:{file:f,rank:rr} });
      }
      break;
    } else {
      break; // có quân khác chen giữa → không tướng-bay
    }
  }
  return moves;
}

// ────────────────────────────────────────────────────────────
// Sĩ (Advisor) — chéo 1 ô trong cung
// ────────────────────────────────────────────────────────────
export function advisorMoves(board, f, r, side) {
  const moves = [];
  const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
  for (const [df, dr] of dirs) {
    const nf = f + df, nr = r + dr;
    if (!inPalace(nf, nr, side)) continue;
    const t = pieceAt(board, nf, nr);
    if (t && t.side === side) continue;
    moves.push({ from:{file:f,rank:r}, to:{file:nf,rank:nr} });
  }
  return moves;
}

// ────────────────────────────────────────────────────────────
// Tượng (Elephant) — chéo 2 ô (田), không qua sông, bị cản mắt tượng
// ────────────────────────────────────────────────────────────
export function elephantMoves(board, f, r, side) {
  const moves = [];
  const dirs = [[2,2],[2,-2],[-2,2],[-2,-2]];
  for (const [df, dr] of dirs) {
    const nf = f + df, nr = r + dr;
    if (!inBoard(nf, nr)) continue;
    if (!sameRiverSide(nr, side)) continue;
    // Mắt tượng (giữa đường)
    const ef = f + df / 2, er = r + dr / 2;
    if (pieceAt(board, ef, er)) continue;     // bị cản
    const t = pieceAt(board, nf, nr);
    if (t && t.side === side) continue;
    moves.push({ from:{file:f,rank:r}, to:{file:nf,rank:nr} });
  }
  return moves;
}
function sameRiverSide(rank, side) {
  // Đỏ chỉ ở rank 5..9, Đen 0..4
  return side === 'r' ? rank >= 5 : rank <= 4;
}

// ────────────────────────────────────────────────────────────
// Mã (Horse) — đi nhật 日, bị cản chân
// ────────────────────────────────────────────────────────────
export function horseMoves(board, f, r, side) {
  const moves = [];
  // 8 hướng, mỗi hướng có "chân" cản (ô liền kề theo hướng dài)
  const dirs = [
    [ 1, 2,  0, 1], [ 1,-2,  0,-1],
    [-1, 2,  0, 1], [-1,-2,  0,-1],
    [ 2, 1,  1, 0], [ 2,-1,  1, 0],
    [-2, 1, -1, 0], [-2,-1, -1, 0],
  ];
  for (const [df, dr, lf, lr] of dirs) {
    const nf = f + df, nr = r + dr;
    if (!inBoard(nf, nr)) continue;
    if (pieceAt(board, f + lf, r + lr)) continue;   // cản chân
    const t = pieceAt(board, nf, nr);
    if (t && t.side === side) continue;
    moves.push({ from:{file:f,rank:r}, to:{file:nf,rank:nr} });
  }
  return moves;
}

// ────────────────────────────────────────────────────────────
// Xe (Rook) — dọc / ngang
// ────────────────────────────────────────────────────────────
export function rookMoves(board, f, r, side) {
  const moves = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [df, dr] of dirs) {
    let nf = f + df, nr = r + dr;
    while (inBoard(nf, nr)) {
      const t = pieceAt(board, nf, nr);
      if (!t) {
        moves.push({ from:{file:f,rank:r}, to:{file:nf,rank:nr} });
      } else {
        if (t.side !== side) moves.push({ from:{file:f,rank:r}, to:{file:nf,rank:nr} });
        break;
      }
      nf += df; nr += dr;
    }
  }
  return moves;
}

// ────────────────────────────────────────────────────────────
// Pháo (Cannon) — đi như Xe khi không ăn; ăn cần đúng 1 ngòi (screen)
// ────────────────────────────────────────────────────────────
export function cannonMoves(board, f, r, side) {
  const moves = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [df, dr] of dirs) {
    let nf = f + df, nr = r + dr;
    // Phase 1: đi không ăn (qua các ô trống)
    while (inBoard(nf, nr) && !pieceAt(board, nf, nr)) {
      moves.push({ from:{file:f,rank:r}, to:{file:nf,rank:nr} });
      nf += df; nr += dr;
    }
    // Phase 2: gặp ngòi → tìm tiếp tục để bắt
    if (inBoard(nf, nr)) {
      // bỏ qua ngòi
      nf += df; nr += dr;
      while (inBoard(nf, nr)) {
        const t = pieceAt(board, nf, nr);
        if (!t) { nf += df; nr += dr; continue; }
        if (t.side !== side) {
          moves.push({ from:{file:f,rank:r}, to:{file:nf,rank:nr} });
        }
        break;
      }
    }
  }
  return moves;
}

// ────────────────────────────────────────────────────────────
// Tốt (Pawn) — tiến 1 ô; sau sông có thể đi ngang; không lùi
// ────────────────────────────────────────────────────────────
export function pawnMoves(board, f, r, side) {
  const moves = [];
  const forward = side === 'r' ? -1 : 1; // Đỏ tiến lên (rank giảm), Đen tiến xuống (rank tăng)
  // Tiến
  const tf = f, tr = r + forward;
  if (inBoard(tf, tr)) {
    const t = pieceAt(board, tf, tr);
    if (!t || t.side !== side) {
      moves.push({ from:{file:f,rank:r}, to:{file:tf,rank:tr} });
    }
  }
  // Đi ngang sau khi qua sông
  if (acrossRiver(r, side)) {
    for (const df of [-1, 1]) {
      const nf = f + df, nr = r;
      if (!inBoard(nf, nr)) continue;
      const t = pieceAt(board, nf, nr);
      if (t && t.side === side) continue;
      moves.push({ from:{file:f,rank:r}, to:{file:nf,rank:nr} });
    }
  }
  return moves;
}

// ────────────────────────────────────────────────────────────
// Sinh nước cho 1 quân ở (f, r)
// ────────────────────────────────────────────────────────────
export function movesForPiece(board, f, r) {
  const p = pieceAt(board, f, r);
  if (!p) return [];
  switch (p.type) {
    case 'K': return generalMoves(board, f, r, p.side);
    case 'A': return advisorMoves(board, f, r, p.side);
    case 'E': return elephantMoves(board, f, r, p.side);
    case 'H': return horseMoves(board, f, r, p.side);
    case 'R': return rookMoves(board, f, r, p.side);
    case 'C': return cannonMoves(board, f, r, p.side);
    case 'P': return pawnMoves(board, f, r, p.side);
    default:  return [];
  }
}

/** Sinh tất cả pseudo-legal moves cho `side`. */
export function generatePseudoLegalMoves(board, side) {
  const out = [];
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p || p.side !== side) continue;
      const ms = movesForPiece(board, f, r);
      for (const m of ms) out.push(m);
    }
  }
  return out;
}
