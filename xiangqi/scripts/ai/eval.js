// Cờ Tướng Vương — hàm đánh giá thế cờ (enhanced)
import { BOARD_W, BOARD_H, OPP } from '../core/constants.js';
import { findGeneral } from '../core/board.js';
import { generatePseudoLegalMoves } from '../core/moves.js';
import { MATERIAL, pstScore } from './pst.js';

/**
 * Trả về điểm centipawn từ góc nhìn `side`.
 * Dương = `side` đang ưu thế; Âm = đối phương ưu thế.
 *
 * Thành phần (Enhanced):
 *   1. Material (giá trị quân)
 *   2. PST (vị trí) — increased weights
 *   3. Pawn advancement (tốt gần promote được bonus)
 *   4. King safety (chi tiết hơn)
 *   5. Piece centralization (quân ở trung tâm)
 *   6. Mobility (linh hoạt tấn công)
 */
export function evaluate(board, side) {
  // 1+2: material + PST
  let scoreRed = 0, scoreBlack = 0;
  let redAdvisor = 0, redElephant = 0;
  let blackAdvisor = 0, blackElephant = 0;
  let redPawns = 0, blackPawns = 0;
  let redAdvancedPawns = 0, blackAdvancedPawns = 0;

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
        else if (p.type === 'P') {
          redPawns++;
          // Pawn advancement bonus: pawns near opponent side worth more
          if (r >= 5) {
            redAdvancedPawns++;
            scoreRed += (r - 4) * 30; // Bonus increases closer to rank 9
          }
        }
      } else {
        scoreBlack += mat + pst;
        if (p.type === 'A') blackAdvisor++;
        else if (p.type === 'E') blackElephant++;
        else if (p.type === 'P') {
          blackPawns++;
          // Black pawns: rank 0 is their side, rank 9 is enemy
          if (r <= 4) {
            blackAdvancedPawns++;
            scoreBlack += (5 - r) * 30;
          }
        }
      }
    }
  }

  // 4: King safety — enhanced with advisor/elephant + pawn cover
  // Tướng nên có ít nhất Sĩ và Tượng để bảo vệ cung
  scoreRed   += redAdvisor * 8 + redElephant * 6;
  scoreBlack += blackAdvisor * 8 + blackElephant * 6;

  // Phạt khi mất quá nhiều Sĩ/Tượng
  if (redAdvisor === 0) scoreRed -= 50;
  if (blackAdvisor === 0) scoreBlack -= 50;
  if (redElephant <= 1) scoreRed -= 40;
  if (blackElephant <= 1) scoreBlack -= 40;

  // 5: Piece centralization — quân ở giữa bàn cờ tốt hơn
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p || p.type === 'K') continue; // Skip King

      // Distance from center (4, 4.5)
      const distFromCenter = Math.abs(f - 4) + Math.abs(r - 4.5);
      const centralityBonus = (10 - distFromCenter) * 2;

      if (p.type === 'R' || p.type === 'C') {
        // Heavy pieces benefit more from centralization
        if (p.side === 'r') scoreRed += centralityBonus;
        else scoreBlack += centralityBonus;
      } else if (p.type === 'H') {
        // Knight benefits moderately
        if (p.side === 'r') scoreRed += centralityBonus * 0.7;
        else scoreBlack += centralityBonus * 0.7;
      }
    }
  }

  // 3: Mobility — weighted higher for attacking capabilities
  const mRed   = generatePseudoLegalMoves(board, 'r').length;
  const mBlack = generatePseudoLegalMoves(board, 'b').length;
  scoreRed   += mRed   * 3;  // Increased from 1 to 3
  scoreBlack += mBlack * 3;

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
