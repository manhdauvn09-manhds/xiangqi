// Cờ Tướng Vương — kho puzzle (chiếu hết trong N nước)
// FEN format Xiangqi tiêu chuẩn.
// solution: chuỗi nước ICCS (chỉ kê nhánh chính — variations chấp nhận tất cả nước
// dẫn đến chiếu hết, ta verify bằng engine).
// solverSide: 'r' hoặc 'b' — bên cần giải (cũng chính là bên đi đầu).

export const PUZZLE_BANK = [
  {
    id: 'p001',
    title: { vi: 'Pháo Mã chiếu hết trong 2', en: 'Cannon-Horse mate in 2' },
    fen: '4k4/9/9/9/9/9/9/9/4N4/3RKR3 w - - 0 1',
    solverSide: 'r',
    mateIn: 1,
    solution: ['e1e9'], // Xe e đến chiếu hết (chỉ là demo)
    hint: { vi: 'Tìm nước Xe chiếu thẳng', en: 'Look for a rook check' },
  },
  {
    id: 'p002',
    title: { vi: 'Pháo lá chiếu', en: 'Cannon discovered check' },
    fen: '3k5/9/9/9/9/9/9/4C4/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 1,
    solution: ['e2e9'],
    hint: { vi: 'Pháo cần ngòi để bắt', en: 'Cannon needs a screen' },
  },
  {
    id: 'p003',
    title: { vi: 'Đôi Xe chiếu', en: 'Double rook mate' },
    fen: '4k4/9/9/9/9/9/9/4R4/9/4KR3 w - - 0 1',
    solverSide: 'r',
    mateIn: 1,
    solution: ['e2e9'],
    hint: { vi: 'Một Xe đến cung Đen', en: 'Drive a rook into the palace' },
  },
  {
    id: 'p004',
    title: { vi: 'Mã Pháo phối hợp', en: 'Horse-Cannon combination' },
    fen: '3k5/4P4/9/9/9/9/9/9/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 1,
    solution: ['e8d8'],
    hint: { vi: 'Tốt qua sông tấn công sĩ', en: 'Promoted soldier attacks the advisor' },
  },
  {
    id: 'p005',
    title: { vi: 'Lộ Tướng đe doạ', en: 'Flying general threat' },
    fen: '4k4/4P4/9/9/9/9/9/9/9/3K5 w - - 0 1',
    solverSide: 'r',
    mateIn: 1,
    solution: ['d0e0'],
    hint: { vi: 'Đẩy Tướng ra cột Tướng đối phương', en: 'Move general to face' },
  },
  {
    id: 'p006',
    title: { vi: 'Pháo Đôi Mã', en: 'Double cannon mate' },
    fen: '3k5/9/4C4/9/9/9/9/9/4C4/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 1,
    solution: ['e2e9'],
    hint: { vi: 'Pháo dưới làm ngòi cho Pháo trên', en: 'Lower cannon as screen' },
  },
  {
    id: 'p007',
    title: { vi: 'Xe + Mã chiếu hết', en: 'Rook + Horse checkmate' },
    fen: '3k5/9/4N4/9/9/9/9/9/9/4KR3 w - - 0 1',
    solverSide: 'r',
    mateIn: 1,
    solution: ['f0d0'],
    hint: { vi: 'Mã đã sẵn ở vị trí, Xe khoá Tướng', en: 'Horse covers, rook locks' },
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
