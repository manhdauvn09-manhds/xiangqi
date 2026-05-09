// Cờ Tướng Vương — constants
// Coordinate system:
//   file (cột) 0..8  (a..i, từ trái sang phải theo hướng Đỏ ngồi dưới)
//   rank (hàng) 0..9 (từ trên xuống — Đen ở rank 0..2/3, Đỏ ở rank 7..9)
// Tướng Đỏ ban đầu ở (4,9), Tướng Đen ở (4,0).

export const BOARD_W = 9;
export const BOARD_H = 10;
export const RIVER_TOP = 4;     // hàng trên cùng của Đỏ qua sông
export const RIVER_BOT = 5;     // hàng đầu tiên của Đen qua sông

// Piece types — single-char để dễ debug
export const PIECE = Object.freeze({
  GENERAL:  'K',  // Tướng (帥/將)
  ADVISOR:  'A',  // Sĩ (仕/士)
  ELEPHANT: 'E',  // Tượng (相/象)
  HORSE:    'H',  // Mã (傌/馬)
  ROOK:     'R',  // Xe (俥/車)
  CANNON:   'C',  // Pháo (炮/砲)
  PAWN:     'P',  // Tốt/Binh (兵/卒)
});

export const SIDE = Object.freeze({ RED: 'r', BLACK: 'b' });

export const OPP = { r: 'b', b: 'r' };

// Hán tự hiển thị trên quân
export const HAN = Object.freeze({
  K: { r: '帥', b: '將' },
  A: { r: '仕', b: '士' },
  E: { r: '相', b: '象' },
  H: { r: '傌', b: '馬' },
  R: { r: '俥', b: '車' },
  C: { r: '炮', b: '砲' },
  P: { r: '兵', b: '卒' },
});

// Palace bounds: file [3,5], rank Đỏ [7,9] / Đen [0,2]
export const PALACE = Object.freeze({
  r: { fileMin: 3, fileMax: 5, rankMin: 7, rankMax: 9 },
  b: { fileMin: 3, fileMax: 5, rankMin: 0, rankMax: 2 },
});

// FEN khởi đầu chuẩn (theo chuẩn Xiangqi FEN):
// hàng 0 (Đen ngồi trên) → hàng 9 (Đỏ ngồi dưới)
// chữ hoa = Đỏ, chữ thường = Đen
export const INITIAL_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';

// Map FEN char → { type, side }
export const FEN_MAP = Object.freeze({
  K: { type: 'K', side: 'r' }, k: { type: 'K', side: 'b' },
  A: { type: 'A', side: 'r' }, a: { type: 'A', side: 'b' },
  B: { type: 'E', side: 'r' }, b: { type: 'E', side: 'b' }, // FEN dùng B cho elephant (bishop-like)
  N: { type: 'H', side: 'r' }, n: { type: 'H', side: 'b' }, // N = kNight (horse)
  R: { type: 'R', side: 'r' }, r: { type: 'R', side: 'b' },
  C: { type: 'C', side: 'r' }, c: { type: 'C', side: 'b' },
  P: { type: 'P', side: 'r' }, p: { type: 'P', side: 'b' },
});

export const FEN_CHAR = (piece) => {
  const map = { K:'K', A:'A', E:'B', H:'N', R:'R', C:'C', P:'P' };
  const ch = map[piece.type];
  return piece.side === 'r' ? ch : ch.toLowerCase();
};

/** Có nằm trong bàn không? */
export function inBoard(file, rank) {
  return file >= 0 && file < BOARD_W && rank >= 0 && rank < BOARD_H;
}

/** Có nằm trong cung của bên `side` không? */
export function inPalace(file, rank, side) {
  const p = PALACE[side];
  return file >= p.fileMin && file <= p.fileMax && rank >= p.rankMin && rank <= p.rankMax;
}

/** Đã qua sông từ góc nhìn `side`? */
export function acrossRiver(rank, side) {
  return side === 'r' ? rank <= RIVER_TOP : rank >= RIVER_BOT;
}
