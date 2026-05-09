// Cờ Tướng Vương — luật cờ: legal filter, check, checkmate, stalemate, repetition, 60-move
import { OPP, BOARD_W, BOARD_H } from './constants.js';
import { applyMove, undoMove, pieceAt, findGeneral } from './board.js';
import { generatePseudoLegalMoves } from './moves.js';

/** Tướng `side` có đang bị chiếu không?
 * Cách đơn giản: sinh mọi nước pseudo-legal của đối phương,
 * nếu có nước đến ô của Tướng → đang bị chiếu.
 * Đồng thời kiểm tra "lộ tướng" (2 Tướng nhìn nhau cùng cột) — luật Xiangqi.
 */
export function isCheck(board, side) {
  const king = findGeneral(board, side);
  if (!king) return true; // không có Tướng = thua
  const opp = OPP[side];
  // Tướng-bay đã được generalMoves sinh ra, nên cứ check tất cả nước của đối phương
  const moves = generatePseudoLegalMoves(board, opp);
  for (const m of moves) {
    if (m.to.file === king.file && m.to.rank === king.rank) return true;
  }
  return false;
}

/** Hai Tướng có đang nhìn thẳng nhau (lộ tướng) không?
 * Cờ Tướng cấm để 2 Tướng nhìn thẳng — nước nào tạo ra trạng thái này là phạm luật.
 */
export function isFacingGenerals(board) {
  const r = findGeneral(board, 'r');
  const b = findGeneral(board, 'b');
  if (!r || !b) return false;
  if (r.file !== b.file) return false;
  // Kiểm tra giữa có quân không
  const lo = Math.min(r.rank, b.rank) + 1;
  const hi = Math.max(r.rank, b.rank) - 1;
  for (let k = lo; k <= hi; k++) {
    if (pieceAt(board, r.file, k)) return false;
  }
  return true;
}

/** Nước này có hợp lệ không? — thử apply, kiểm tra Tướng mình không bị chiếu, rồi undo. */
export function isLegalMove(board, move) {
  applyMove(board, move);
  // Sau khi đi, đến lượt đối phương — nhưng "side" mình thực ra là người vừa đi
  const movedSide = OPP[board.side];
  // Quy tắc 1: Tướng mình không được chiếu
  const inCheck = isCheck(board, movedSide);
  // Quy tắc 2: không được lộ tướng (đã được isCheck cover qua tướng-bay generation)
  const facing = isFacingGenerals(board);
  undoMove(board);
  return !inCheck && !facing;
}

/** Lọc legal moves từ pseudo-legal */
export function generateLegalMoves(board, side) {
  const ps = generatePseudoLegalMoves(board, side);
  const out = [];
  for (const m of ps) {
    if (isLegalMove(board, m)) out.push(m);
  }
  return out;
}

/** Bên `side` đang chiếu hết (không còn nước hợp lệ + đang bị chiếu)? */
export function isCheckmate(board, side) {
  if (!isCheck(board, side)) return false;
  return generateLegalMoves(board, side).length === 0;
}

/** Stalemate trong cờ tướng = bên đến lượt không còn nước hợp lệ + KHÔNG bị chiếu → thua (theo luật Xiangqi). */
export function isStalemate(board, side) {
  if (isCheck(board, side)) return false;
  return generateLegalMoves(board, side).length === 0;
}

/** Đã 60 nước không bắt quân chưa? halfmoveSinceCapture đếm half-move. 60 nước = 120 half-move. */
export function is60MoveDraw(board) {
  return board.halfmoveSinceCapture >= 120;
}

/** Lặp lại thế cờ 3 lần — stub đơn giản (so sánh FEN của 3 thế gần nhất với hiện tại). */
export function isThreefoldRepetition(boardHistoryFENs) {
  if (!boardHistoryFENs || boardHistoryFENs.length < 5) return false;
  const last = boardHistoryFENs[boardHistoryFENs.length - 1];
  // Đếm số lần `last` xuất hiện
  let count = 0;
  for (const fen of boardHistoryFENs) {
    if (fen === last) count += 1;
  }
  return count >= 3;
}

/** Tính kết quả ván nếu có. */
export function detectGameResult(board) {
  const side = board.side; // bên đến lượt
  if (isCheckmate(board, side)) {
    return { ended: true, winner: OPP[side], reason: 'checkmate' };
  }
  if (isStalemate(board, side)) {
    return { ended: true, winner: OPP[side], reason: 'stalemate' };
  }
  if (is60MoveDraw(board)) {
    return { ended: true, winner: null, reason: '60_move' };
  }
  return { ended: false };
}

/** Kiểm tra nếu nước `move` (chưa apply) sẽ chiếu Tướng đối phương. */
export function moveGivesCheck(board, move) {
  applyMove(board, move);
  const opp = board.side; // sau khi đi, board.side đã đổi sang đối phương
  const checked = isCheck(board, opp);
  undoMove(board);
  return checked;
}
