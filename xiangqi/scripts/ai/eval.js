// Cờ Tướng Vương — hàm đánh giá thế cờ
import { BOARD_W, BOARD_H, OPP } from '../core/constants.js';
import { findGeneral } from '../core/board.js';
import { generatePseudoLegalMoves } from '../core/moves.js';
import { MATERIAL, pstScore } from './pst.js';

/**
 * Trả về điểm centipawn từ góc nhìn `side`.
 * Dương = `side` đang ưu thế; Âm = đối phương ưu thế.
 *
 * Thành phần:
 *   1. Material (giá trị quân)
 *   2. PST (vị trí)
 *   3. Mobility (số nước hợp lệ — proxy bằng pseudo-legal cho nhanh)
 *   4. King safety (nhỏ — phạt khi cung mất Sĩ/Tượng)
 */
export function evaluate(board, side) {
  // 1+2: material + PST
  let scoreRed = 0, scoreBlack = 0;
  let redAdvisor = 0, redElephant = 0;
  let blackAdvisor = 0, blackElephant = 0;

  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p) continue;
      const mat = MATERIAL[p.type];
      const pst = pstScore(p, f, r);
      if (p.side === 'r') {
        scoreRed += mat + pst;
        if (p.type === 'A') redAdvisor++;
        else if (p.type === 'E') redElephant++;
      } else {
        scoreBlack += mat + pst;
        if (p.type === 'A') blackAdvisor++;
        else if (p.type === 'E') blackElephant++;
      }
    }
  }

  // 4: King safety — bonus còn đủ Sĩ/Tượng
  scoreRed   += redAdvisor * 6 + redElephant * 4;
  scoreBlack += blackAdvisor * 6 + blackElephant * 4;

  // 3: Mobility — nhẹ
  const mRed   = generatePseudoLegalMoves(board, 'r').length;
  const mBlack = generatePseudoLegalMoves(board, 'b').length;
  scoreRed   += mRed   * 1;
  scoreBlack += mBlack * 1;

  const diff = scoreRed - scoreBlack;
  return side === 'r' ? diff : -diff;
}

/** Phát hiện thế cờ tàn — dùng để chuyển trọng số (chưa dùng ở MVP). */
export function endgameScale(board) {
  let big = 0;
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p) continue;
      if (p.type === 'R') big += 3;
      else if (p.type === 'C' || p.type === 'H') big += 2;
    }
  }
  // big > 12 = mid-game, < 6 = endgame
  return Math.max(0, Math.min(1, (12 - big) / 8));
}
