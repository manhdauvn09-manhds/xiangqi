// Cờ Tướng Vương — board state, FEN serialization
import {
  BOARD_W, BOARD_H, INITIAL_FEN, FEN_MAP, FEN_CHAR, SIDE, OPP, inBoard,
} from './constants.js';

/**
 * Board state:
 * {
 *   squares: (Piece|null)[][]  // squares[file][rank]
 *   side: 'r'|'b'              // bên đến lượt
 *   variant: 'standard'|'blind'
 *   history: Move[]
 *   fullmove: number           // tăng sau mỗi nước Đen đi
 *   halfmoveSinceCapture: number // dùng cho luật 60 nước
 * }
 *
 * Piece: { type, side, hidden? }   // hidden chỉ cờ úp
 */

export function emptyBoard(variant = 'standard') {
  const sq = Array.from({ length: BOARD_W }, () => Array(BOARD_H).fill(null));
  return {
    squares: sq,
    side: 'r',
    variant,
    history: [],
    fullmove: 1,
    halfmoveSinceCapture: 0,
  };
}

/** Tạo board ban đầu từ FEN */
export function createInitialBoard(variant = 'standard') {
  return fromFEN(INITIAL_FEN, variant);
}

export function cloneBoard(board) {
  const sq = board.squares.map(col =>
    col.map(p => (p ? { ...p } : null))
  );
  return {
    squares: sq,
    side: board.side,
    variant: board.variant,
    history: board.history.slice(),
    fullmove: board.fullmove,
    halfmoveSinceCapture: board.halfmoveSinceCapture,
  };
}

export function pieceAt(board, file, rank) {
  if (!inBoard(file, rank)) return null;
  return board.squares[file][rank];
}

export function setPiece(board, file, rank, piece) {
  board.squares[file][rank] = piece;
}

/** Tìm vị trí Tướng của side. Trả {file, rank} hoặc null. */
export function findGeneral(board, side) {
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const p = board.squares[f][r];
      if (p && p.type === 'K' && p.side === side) return { file: f, rank: r };
    }
  }
  return null;
}

/**
 * Thực hiện 1 nước đi (mutate board). Trả về quân bị ăn (hoặc null).
 * Move: { from:{file,rank}, to:{file,rank} }
 * Không validate — nên gọi sau khi đã kiểm tra hợp lệ.
 */
export function applyMove(board, move) {
  const piece = pieceAt(board, move.from.file, move.from.rank);
  if (!piece) throw new Error('applyMove: empty source');
  const captured = pieceAt(board, move.to.file, move.to.rank);

  setPiece(board, move.from.file, move.from.rank, null);
  setPiece(board, move.to.file, move.to.rank, piece);

  // Cập nhật counters
  if (captured) board.halfmoveSinceCapture = 0;
  else board.halfmoveSinceCapture += 1;
  if (board.side === 'b') board.fullmove += 1;
  board.side = OPP[board.side];

  // Lưu vào history (kèm captured cho undo)
  const recorded = {
    from: { ...move.from },
    to: { ...move.to },
    piece: { ...piece },
    captured: captured ? { ...captured } : null,
  };
  board.history.push(recorded);
  return captured;
}

/** Undo nước cuối — phục hồi captured nếu có. */
export function undoMove(board) {
  const m = board.history.pop();
  if (!m) return null;
  setPiece(board, m.from.file, m.from.rank, m.piece);
  setPiece(board, m.to.file, m.to.rank, m.captured);
  board.side = OPP[board.side];
  if (board.side === 'b') board.fullmove -= 1;
  // Không thể khôi phục halfmoveSinceCapture chính xác nếu không lưu — giữ approximate cho AI search là OK
  if (m.captured) board.halfmoveSinceCapture = 0;
  else if (board.halfmoveSinceCapture > 0) board.halfmoveSinceCapture -= 1;
  return m;
}

// ────────────────────────────────────────────────────────────
// FEN serialization (Xiangqi)
//   Hàng được phân tách bằng '/', đếm từ rank 0 (Đen trên) → rank 9 (Đỏ dưới)
//   Trong mỗi hàng, đếm từ file 0 → file 8.
//   Các số liên tiếp = ô trống.
// ────────────────────────────────────────────────────────────

export function toFEN(board) {
  const ranks = [];
  for (let r = 0; r < BOARD_H; r++) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < BOARD_W; f++) {
      const p = board.squares[f][r];
      if (!p) { empty += 1; continue; }
      if (empty > 0) { row += empty; empty = 0; }
      row += FEN_CHAR(p);
    }
    if (empty > 0) row += empty;
    ranks.push(row);
  }
  const sideTok = board.side === 'r' ? 'w' : 'b';
  return `${ranks.join('/')} ${sideTok} - - ${board.halfmoveSinceCapture} ${board.fullmove}`;
}

export function fromFEN(fen, variant = 'standard') {
  const parts = fen.trim().split(/\s+/);
  const placement = parts[0];
  const sideTok = parts[1] || 'w';
  const halfmove = parseInt(parts[4] ?? '0', 10) || 0;
  const fullmove = parseInt(parts[5] ?? '1', 10) || 1;

  const board = emptyBoard(variant);
  const ranks = placement.split('/');
  if (ranks.length !== BOARD_H) {
    throw new Error(`fromFEN: invalid rank count ${ranks.length}`);
  }
  for (let r = 0; r < BOARD_H; r++) {
    let f = 0;
    for (const ch of ranks[r]) {
      if (/[1-9]/.test(ch)) { f += parseInt(ch, 10); continue; }
      const meta = FEN_MAP[ch];
      if (!meta) throw new Error(`fromFEN: bad char "${ch}"`);
      if (f >= BOARD_W) throw new Error(`fromFEN: row ${r} overflow`);
      board.squares[f][r] = { type: meta.type, side: meta.side };
      f += 1;
    }
  }
  board.side = sideTok === 'w' ? 'r' : 'b';
  board.halfmoveSinceCapture = halfmove;
  board.fullmove = fullmove;
  return board;
}
