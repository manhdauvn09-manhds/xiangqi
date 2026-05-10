// Cờ Tướng Vương — search engine: minimax + α-β + iterative deepening + TT
import { OPP } from '../core/constants.js';
import { applyMove, undoMove, pieceAt } from '../core/board.js';
import { generateLegalMoves } from '../core/rules.js';
import { evaluate } from './eval.js';
import { MATERIAL } from './pst.js';
import { TT, TT_FLAG } from './tt.js';
import { hashBoard } from '../core/zobrist.js';

const MATE = 30000;
const INF  = 99999;

const tt = new TT();

function moveEq(a, b) {
  return a && b && a.from.file === b.from.file && a.from.rank === b.from.rank
                 && a.to.file === b.to.file && a.to.rank === b.to.rank;
}

/** Move ordering: TT bestMove → MVV/LVA → killer */
function orderMoves(board, moves, ttBestMove, killer) {
  const scored = moves.map(m => {
    const attacker = pieceAt(board, m.from.file, m.from.rank);
    const target   = pieceAt(board, m.to.file, m.to.rank);
    let s = 0;
    if (moveEq(m, ttBestMove)) s += 100000;
    else if (moveEq(m, killer)) s += 9000;
    if (target) s += MATERIAL[target.type] * 8 - (MATERIAL[attacker?.type] || 0);
    return { m, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map(x => x.m);
}

/**
 * Negamax + alpha-beta.
 * Trả về { score, move? } — move chỉ có ở root.
 *
 * @param board mutable state
 * @param depth ply còn lại
 * @param alpha α
 * @param beta β
 * @param side bên đang đi (để biết tăng giảm điểm theo góc nhìn ai)
 * @param deadline timestamp ms hết hạn (để abort iterative deepening)
 * @param ctx { stop: bool, nodes: number }
 */
function negamax(board, depth, alpha, beta, side, deadline, ctx) {
  ctx.nodes++;
  if (ctx.stop || (deadline && ctx.nodes % 2048 === 0 && performance.now() > deadline)) {
    ctx.stop = true;
    return { score: 0 };
  }

  const alphaOrig = alpha;
  const hash = ctx.useTT ? hashBoard(board) : 0n;

  // TT probe
  let ttBestMove = null;
  if (ctx.useTT) {
    const e = tt.get(hash);
    if (e && e.depth >= depth) {
      if (e.flag === TT_FLAG.EXACT) return { score: e.score, move: e.bestMove };
      if (e.flag === TT_FLAG.LOWER && e.score >= beta)  return { score: e.score, move: e.bestMove };
      if (e.flag === TT_FLAG.UPPER && e.score <= alpha) return { score: e.score, move: e.bestMove };
    }
    if (e) ttBestMove = e.bestMove;
  }

  if (depth <= 0) {
    return { score: evaluate(board, side) };
  }

  const moves = generateLegalMoves(board, side);
  if (moves.length === 0) {
    return { score: -MATE + (board.history.length || 0) };
  }

  const killer = ctx.killers[depth];
  const ordered = orderMoves(board, moves, ttBestMove, killer);
  let best = -INF;
  let bestMove = null;
  for (const m of ordered) {
    applyMove(board, m);
    const sub = negamax(board, depth - 1, -beta, -alpha, OPP[side], deadline, ctx);
    undoMove(board);
    if (ctx.stop) return { score: 0 };
    const v = -sub.score;
    if (v > best) { best = v; bestMove = m; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) {
      // killer move heuristic: lưu nước cắt cành non-capture để sắp xếp tốt lần sau
      if (!pieceAt(board, m.to.file, m.to.rank)) ctx.killers[depth] = m;
      break;
    }
  }

  // TT store
  if (ctx.useTT) {
    let flag = TT_FLAG.EXACT;
    if (best <= alphaOrig) flag = TT_FLAG.UPPER;
    else if (best >= beta) flag = TT_FLAG.LOWER;
    tt.put(hash, depth, best, flag, bestMove);
  }
  return { score: best, move: bestMove };
}

/**
 * Tìm nước tốt nhất với iterative deepening.
 * @param board mutable state (sẽ được khôi phục sau search)
 * @param opts.maxDepth depth tối đa (1..6)
 * @param opts.timeMs ngân sách thời gian (ms); ưu tiên timeMs nếu set
 * @param opts.onProgress callback({ depth, score, pv })
 *
 * Trả về { move, score, depth, nodes, ms }
 */
export function searchBestMove(board, opts = {}) {
  const maxDepth = Math.max(1, Math.min(6, opts.maxDepth || 5));  // Increased from 3 to 5
  const timeMs = opts.timeMs ?? 0;
  const start = performance.now();
  const deadline = timeMs > 0 ? start + timeMs : 0;

  const side = board.side;
  let best = { move: null, score: 0, depth: 0 };
  const ctx = {
    stop: false,
    nodes: 0,
    useTT: !!opts.useTT,
    killers: new Array(maxDepth + 2).fill(null),
  };

  for (let d = 1; d <= maxDepth; d++) {
    const { score, move } = negamax(board, d, -INF, INF, side, deadline, ctx);
    if (ctx.stop) break;
    if (move) best = { move, score, depth: d };
    if (opts.onProgress) opts.onProgress({ depth: d, score, move });
    if (deadline && performance.now() > deadline) break;
    if (Math.abs(score) > MATE - 100) break;
  }

  return { ...best, nodes: ctx.nodes, ms: performance.now() - start, ttSize: tt.size() };
}

/** Top-N nước ứng viên — dùng cho hint. */
export function searchTopMoves(board, opts = {}) {
  const maxDepth = Math.max(1, Math.min(4, opts.maxDepth || 3));
  const side = board.side;
  const moves = generateLegalMoves(board, side);
  const scored = [];
  for (const m of moves) {
    applyMove(board, m);
    const r = searchBestMove(board, { maxDepth: maxDepth - 1, timeMs: 0 });
    undoMove(board);
    scored.push({ move: m, score: -r.score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, opts.topN || 3);
}

/** Random move — cho lv 1 */
export function randomMove(board) {
  const moves = generateLegalMoves(board, board.side);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

/** Greedy — ăn nếu có, không thì random — cho lv 1 */
export function greedyCaptureMove(board) {
  const moves = generateLegalMoves(board, board.side);
  if (moves.length === 0) return null;
  let bestCap = null;
  let bestVal = 0;
  for (const m of moves) {
    const t = pieceAt(board, m.to.file, m.to.rank);
    if (t && MATERIAL[t.type] > bestVal) {
      bestVal = MATERIAL[t.type];
      bestCap = m;
    }
  }
  return bestCap || moves[Math.floor(Math.random() * moves.length)];
}
