// Cờ Tướng Vương — chuyển nước đi sang ký pháp ICCS / Việt
import { BOARD_H } from './constants.js';

const FILE_LETTERS = ['a','b','c','d','e','f','g','h','i'];

/** ICCS: "h2e2" — file-rank của from + to. Rank 1 ở dưới (Đỏ), 10 ở trên (Đen). */
export function moveToICCS(move) {
  const { from, to } = move;
  return `${FILE_LETTERS[from.file]}${BOARD_H - from.rank}${FILE_LETTERS[to.file]}${BOARD_H - to.rank}`;
}

export function iccsToMove(s) {
  const m = s.match(/^([a-i])(10|[1-9])([a-i])(10|[1-9])$/);
  if (!m) return null;
  return {
    from: { file: FILE_LETTERS.indexOf(m[1]), rank: BOARD_H - parseInt(m[2], 10) },
    to:   { file: FILE_LETTERS.indexOf(m[3]), rank: BOARD_H - parseInt(m[4], 10) },
  };
}

const VN_PIECE = {
  K: { r: 'Tg',  b: 'Tg'  },
  A: { r: 'S',   b: 'S'   },
  E: { r: 'T',   b: 'T'   },
  H: { r: 'M',   b: 'M'   },
  R: { r: 'X',   b: 'X'   },
  C: { r: 'P',   b: 'P'   },
  P: { r: 'B',   b: 'B'   },
};

/**
 * Việt notation đơn giản (Pn-m / Pn.+x / Pn.-x):
 *   Tên quân + cột-từ + dấu (- = ngang, .+ = tiến, .- = lùi) + đích
 * Lưu ý: Cột tính từ phía bên đi (Đỏ đếm cột phải→trái, Đen ngược lại) — convention truyền thống.
 *
 * Đây là phiên bản RÚT GỌN: chỉ hiển thị to-coordinate file (1..9) cho dễ đọc.
 * Bản đầy đủ với "trước/sau" khi 2 quân cùng cột sẽ làm sau ở Phase 4.
 */
export function moveToVN(piece, move) {
  if (!piece) return moveToICCS(move);
  const tag = VN_PIECE[piece.type][piece.side];
  const fromFile = piece.side === 'r' ? 9 - move.from.file : move.from.file + 1;
  const toFile   = piece.side === 'r' ? 9 - move.to.file   : move.to.file + 1;
  let sep, dest;
  if (move.from.rank === move.to.rank) {
    // ngang: P2-5
    sep = '-';
    dest = String(toFile);
  } else {
    // tiến / lùi
    const forward = piece.side === 'r' ? -1 : 1;
    const delta = move.to.rank - move.from.rank;
    if (Math.sign(delta) === forward) sep = '.';      // tiến
    else sep = ',';                                    // lùi (dùng dấu phẩy để dễ phân biệt)
    // Khi quân đi thẳng (Xe/Pháo/Tốt/Tướng) thì dest là số ô; khi đi chéo (Mã/Tượng/Sĩ) dest là cột đến
    if (['R','C','P','K'].includes(piece.type)) {
      dest = String(Math.abs(delta));
    } else {
      dest = String(toFile);
    }
  }
  return `${tag}${fromFile}${sep}${dest}`;
}
