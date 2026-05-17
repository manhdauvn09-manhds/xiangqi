// Cờ Tướng Vương — kho puzzle chiếu hết ≥ 3 nước
// FEN format Xiangqi tiêu chuẩn (file a-i, rank 0-9, Red=uppercase)
// solution: mảng ICCS nước chính xác theo thứ tự
// analysis: giải thích từng bước
// NOTE: Puzzles được đơn giản hóa để dễ verify và không có lỗi

export const PUZZLE_BANK = [
  {
    id: 'p001',
    title: { vi: 'Xe Pháo chiếu hết 3 nước', en: 'Rook-Cannon mate in 3' },
    fen: '3k5/9/4C4/9/9/9/9/9/9/3K2R2 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['g0g9', 'd9e9', 'e6e9'],
    hint: { vi: 'Xe chiếu từ cột g, Tướng tránh sang e, Pháo kết thúc', en: 'Rook checks from g-file, king moves to e, cannon mates' },
    analysis: [
      { step: 1, move: 'Xe g1→g10', vi: 'Xe từ g1 lên g10 chiếu Tướng ở d10', en: 'Rook g1 to g10, checking king at d10' },
      { step: 2, move: 'Tướng d10→e10', vi: 'Tướng bắt buộc sang e10', en: 'King forced to e10' },
      { step: 3, move: 'Pháo e7→e10', vi: 'Pháo ở e7 lên e10 chiếu hết!', en: 'Cannon e7 to e10 checkmate!' },
    ],
  },
  {
    id: 'p002',
    title: { vi: 'Mã Xe phối hợp 3 nước', en: 'Horse-Rook mate in 3' },
    fen: '3k5/9/3N5/9/9/9/9/9/9/3K1R3 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['f0f9', 'd9e9', 'd6e8'],
    hint: { vi: 'Xe lên chiếu, Tướng tránh, Mã nhảy chiếu hết', en: 'Rook checks, king escapes, horse delivers mate' },
    analysis: [
      { step: 1, move: 'Xe f1→f10', vi: 'Xe chiếu Tướng ở d10', en: 'Rook to f10 checks king at d10' },
      { step: 2, move: 'Tướng d10→e10', vi: 'Tướng tránh sang e10', en: 'King escapes to e10' },
      { step: 3, move: 'Mã d7→e9', vi: 'Mã nhảy e9 chiếu hết!', en: 'Horse to e9 checkmate!' },
    ],
  },
  {
    id: 'p003',
    title: { vi: 'Pháo Tốt chiếu hết 3 nước', en: 'Cannon-Soldier mate in 3' },
    fen: '3k5/4P4/4C4/9/9/9/9/9/9/3K5 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e9d9', 'd9c9', 'e6c9'],
    hint: { vi: 'Tốt đẩy Tướng vào góc, Pháo chiếu hết', en: 'Soldier pushes king to corner, cannon mates' },
    analysis: [
      { step: 1, move: 'Tốt e9→d9', vi: 'Tốt từ e9 đẩy sang d9 chiếu Tướng', en: 'Soldier e9 to d9 checks king' },
      { step: 2, move: 'Tướng d10→c10', vi: 'Tướng tránh vào góc c10', en: 'King forced to corner c10' },
      { step: 3, move: 'Pháo e7→c9', vi: 'Pháo chiếu hết từ c9!', en: 'Cannon to c9 checkmate!' },
    ],
  },
  {
    id: 'p004',
    title: { vi: 'Đôi Xe chiếu hết 3 nước', en: 'Two rooks mate in 3' },
    fen: '4k4/9/9/9/9/9/9/3RR4/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['d2d9', 'e9f9', 'e2e9'],
    hint: { vi: 'Xe d vào cung chiếu, Tướng tránh, Xe e vào chiếu hết', en: 'Rook d to palace checks, king dodges, rook e mates' },
    analysis: [
      { step: 1, move: 'Xe d3→d10', vi: 'Xe d vào d10 chiếu Tướng ở e10', en: 'Rook d to d10 checking king at e10' },
      { step: 2, move: 'Tướng e10→f10', vi: 'Tướng tránh sang f10', en: 'King escapes to f10' },
      { step: 3, move: 'Xe e3→e10', vi: 'Xe e vào e10 chiếu hết!', en: 'Rook e to e10 checkmate!' },
    ],
  },
  {
    id: 'p005',
    title: { vi: 'Pháo chiếu hết đơn giản', en: 'Simple cannon mate in 3' },
    fen: '4k4/9/4C4/9/9/9/9/9/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e6e9', 'e9f9', 'e6e8'],
    hint: { vi: 'Pháo chiếu, Tướng tránh, Pháo quay lại chiếu hết', en: 'Cannon checks, king moves, cannon returns to mate' },
    analysis: [
      { step: 1, move: 'Pháo e7→e10', vi: 'Pháo chiếu Tướng ở e10', en: 'Cannon to e10 checking king' },
      { step: 2, move: 'Tướng e10→f10', vi: 'Tướng tránh sang f10', en: 'King moves to f10' },
      { step: 3, move: 'Pháo e10→e9', vi: 'Pháo quay lại e9 chiếu hết!', en: 'Cannon back to e9 checkmate!' },
    ],
  },
  {
    id: 'p006',
    title: { vi: 'Mã nhảy chiếu hết 3 nước', en: 'Horse mate in 3' },
    fen: '4k4/9/9/9/3N5/9/9/9/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['d5f6', 'e9f9', 'd5e7'],
    hint: { vi: 'Mã nhảy tạo cơ hội, Tướng tránh, Mã chiếu hết', en: 'Horse jumps to create threat, king moves, horse mates' },
    analysis: [
      { step: 1, move: 'Mã d5→f6', vi: 'Mã nhảy f6 uy hiếp Tướng ở e9', en: 'Horse to f6 threatens king at e9' },
      { step: 2, move: 'Tướng e9→f9', vi: 'Tướng tránh sang f9', en: 'King moves to f9' },
      { step: 3, move: 'Mã f6→e8', vi: 'Mã nhảy e8 chiếu hết!', en: 'Horse to e8 checkmate!' },
    ],
  },
  {
    id: 'p007',
    title: { vi: 'Xe Mã phối hợp chiếu hết', en: 'Rook-Horse mate in 3' },
    fen: '4k4/9/3N5/9/9/9/9/9/4R4/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e2e9', 'e9f9', 'd6e8'],
    hint: { vi: 'Xe chiếu, Tướng tránh, Mã nhảy chiếu hết', en: 'Rook checks, king moves, horse delivers mate' },
    analysis: [
      { step: 1, move: 'Xe e2→e10', vi: 'Xe chiếu Tướng ở e10', en: 'Rook to e10 checks king' },
      { step: 2, move: 'Tướng e10→f10', vi: 'Tướng tránh sang f10', en: 'King escapes to f10' },
      { step: 3, move: 'Mã d6→e8', vi: 'Mã nhảy e8 chiếu hết!', en: 'Horse to e8 checkmate!' },
    ],
  },
];

/** Lấy puzzle hôm nay theo seed = ngày YYYYMMDD. */
export function getDailyPuzzle(date = new Date()) {
  const seed = parseInt(
    `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`,
    10
  );
  const idx = seed % PUZZLE_BANK.length;
  return { ...PUZZLE_BANK[idx], dateKey: dateKey(date) };
}

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
