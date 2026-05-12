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

// ─────────────── Enhanced Evaluation (Levels 8-10) ───────────────

/** Detect passed pawns (enemy has no pawns blocking advancement) */
function evaluatePassedPawns(board, side) {
  let score = 0;
  const opp = OPP[side];

  // Get opponent pawn positions
  const oppPawns = [];
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (p && p.side === opp && p.type === 'P') {
        oppPawns.push({ file: f, rank: r });
      }
    }
  }

  // Check each of our pawns
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p || p.side !== side || p.type !== 'P') continue;

      let isPassedPawn = true;
      if (side === 'r') {
        // Red pawn: check if opponent has pawns in files f-1..f+1, ranks r+1..9
        for (const op of oppPawns) {
          if (op.file >= f - 1 && op.file <= f + 1 && op.rank > r) {
            isPassedPawn = false;
            break;
          }
        }
        if (isPassedPawn) score += 100;
      } else {
        // Black pawn: check if opponent has pawns in files f-1..f+1, ranks r-1..0
        for (const op of oppPawns) {
          if (op.file >= f - 1 && op.file <= f + 1 && op.rank < r) {
            isPassedPawn = false;
            break;
          }
        }
        if (isPassedPawn) score += 100;
      }
    }
  }

  return side === 'r' ? score : -score;
}

/** Evaluate pawn structure (connected, doubled, isolated) */
function evaluatePawnStructure(board, side) {
  let scoreRed = 0, scoreBlack = 0;

  // Get pawn positions by side
  const redPawns = [], blackPawns = [];
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (p && p.type === 'P') {
        if (p.side === 'r') redPawns.push({ file: f, rank: r });
        else blackPawns.push({ file: f, rank: r });
      }
    }
  }

  // Evaluate red pawns
  for (const p of redPawns) {
    let pawnScore = 0;
    // Check for connected pawns (neighboring files, close ranks)
    const hasNeighbor = redPawns.some(rp =>
      Math.abs(rp.file - p.file) === 1 && Math.abs(rp.rank - p.rank) <= 1
    );
    if (hasNeighbor) pawnScore += 15;

    // Check for doubled pawns (same file)
    const doubled = redPawns.filter(rp => rp.file === p.file).length > 1;
    if (doubled) pawnScore -= 20;

    // Check for isolated pawns (no neighbors on adjacent files)
    const hasAdjacentFile = redPawns.some(rp =>
      Math.abs(rp.file - p.file) === 1
    );
    if (!hasAdjacentFile) pawnScore -= 10;

    scoreRed += pawnScore;
  }

  // Evaluate black pawns (same logic)
  for (const p of blackPawns) {
    let pawnScore = 0;
    const hasNeighbor = blackPawns.some(bp =>
      Math.abs(bp.file - p.file) === 1 && Math.abs(bp.rank - p.rank) <= 1
    );
    if (hasNeighbor) pawnScore += 15;

    const doubled = blackPawns.filter(bp => bp.file === p.file).length > 1;
    if (doubled) pawnScore -= 20;

    const hasAdjacentFile = blackPawns.some(bp => Math.abs(bp.file - p.file) === 1);
    if (!hasAdjacentFile) pawnScore -= 10;

    scoreBlack += pawnScore;
  }

  const diff = scoreRed - scoreBlack;
  return side === 'r' ? diff : -diff;
}

/** Enhanced king safety evaluation */
function enhancedKingSafety(board, side) {
  let scoreRed = 0, scoreBlack = 0;

  const redKing = findGeneral(board, 'r');
  const blackKing = findGeneral(board, 'b');

  // Red king safety
  if (redKing) {
    let redAdvisors = 0, redElephants = 0;
    for (let f = 0; f < BOARD_W; f++) {
      for (let r = 0; r < BOARD_H; r++) {
        const p = board.squares[f][r];
        if (p && p.side === 'r') {
          if (p.type === 'A') redAdvisors++;
          else if (p.type === 'E') redElephants++;
        }
      }
    }

    // Fortress strength: count escape squares
    let escapeSquares = 0;
    for (let f = 3; f <= 5; f++) {
      for (let r = 0; r <= 2; r++) {
        if (!board.squares[f][r]) escapeSquares++;
      }
    }

    if (redAdvisors === 0) scoreRed -= 80;
    if (redElephants === 0) scoreRed -= 60;
    if (escapeSquares === 0) scoreRed += 50; // Strong fortress
  }

  // Black king safety (symmetric)
  if (blackKing) {
    let blackAdvisors = 0, blackElephants = 0;
    for (let f = 0; f < BOARD_W; f++) {
      for (let r = 0; r < BOARD_H; r++) {
        const p = board.squares[f][r];
        if (p && p.side === 'b') {
          if (p.type === 'A') blackAdvisors++;
          else if (p.type === 'E') blackElephants++;
        }
      }
    }

    let escapeSquares = 0;
    for (let f = 3; f <= 5; f++) {
      for (let r = 7; r <= 9; r++) {
        if (!board.squares[f][r]) escapeSquares++;
      }
    }

    if (blackAdvisors === 0) scoreBlack -= 80;
    if (blackElephants === 0) scoreBlack -= 60;
    if (escapeSquares === 0) scoreBlack += 50;
  }

  const diff = scoreRed - scoreBlack;
  return side === 'r' ? diff : -diff;
}

/** Evaluate piece activity (rooks on open files, cannon support, etc.) */
function evaluatePieceActivity(board, side) {
  let scoreRed = 0, scoreBlack = 0;

  // Get pawn files for open file detection
  const redPawnFiles = new Set(), blackPawnFiles = new Set();
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (p && p.type === 'P') {
        if (p.side === 'r') redPawnFiles.add(f);
        else blackPawnFiles.add(f);
      }
    }
  }

  // Evaluate red pieces
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p || p.side !== 'r') continue;

      if (p.type === 'R') {
        // Rook on open file
        if (!redPawnFiles.has(f)) scoreRed += 20;

        // Rook on same file as enemy rook (pressure)
        let hasEnemyRook = false;
        for (let cr = 0; cr < BOARD_H; cr++) {
          const cp = board.squares[f][cr];
          if (cp && cp.type === 'R' && cp.side === 'b') {
            hasEnemyRook = true;
            break;
          }
        }
        if (hasEnemyRook) scoreRed += 15;
      } else if (p.type === 'C') {
        // Cannon supporting a piece (rough estimate)
        let supporting = 0;
        for (let nf = f - 1; nf <= f + 1; nf++) {
          for (let nr = r - 1; nr <= r + 1; nr++) {
            if (nf >= 0 && nf < BOARD_W && nr >= 0 && nr < BOARD_H) {
              const np = board.squares[nf][nr];
              if (np && np.side === 'r' && np.type !== 'K') supporting++;
            }
          }
        }
        if (supporting > 0) scoreRed += 10;
      }
    }
  }

  // Evaluate black pieces (symmetric)
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (!p || p.side !== 'b') continue;

      if (p.type === 'R') {
        if (!blackPawnFiles.has(f)) scoreBlack += 20;

        let hasEnemyRook = false;
        for (let cr = 0; cr < BOARD_H; cr++) {
          const cp = board.squares[f][cr];
          if (cp && cp.type === 'R' && cp.side === 'r') {
            hasEnemyRook = true;
            break;
          }
        }
        if (hasEnemyRook) scoreBlack += 15;
      } else if (p.type === 'C') {
        let supporting = 0;
        for (let nf = f - 1; nf <= f + 1; nf++) {
          for (let nr = r - 1; nr <= r + 1; nr++) {
            if (nf >= 0 && nf < BOARD_W && nr >= 0 && nr < BOARD_H) {
              const np = board.squares[nf][nr];
              if (np && np.side === 'b' && np.type !== 'K') supporting++;
            }
          }
        }
        if (supporting > 0) scoreBlack += 10;
      }
    }
  }

  const diff = scoreRed - scoreBlack;
  return side === 'r' ? diff : -diff;
}

/** Enhanced evaluation wrapper for levels 8-10 */
export function evaluateEnhanced(board, side, level) {
  // Standard evaluation
  let score = evaluate(board, side);

  // Add enhanced factors for levels 8-10
  if (level >= 8) {
    score += evaluatePassedPawns(board, side);
    score += evaluatePawnStructure(board, side);
    score += enhancedKingSafety(board, side);
    score += evaluatePieceActivity(board, side);
  }

  return score;
}
