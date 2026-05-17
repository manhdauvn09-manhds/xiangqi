// Cờ Tướng Vương — kho puzzle chiếu hết ≥ 3 nước
// FEN format Xiangqi tiêu chuẩn (file a-i, rank 0-9, Red=uppercase)
// solution: mảng ICCS nước chính xác theo thứ tự
// analysis: giải thích từng bước

export const PUZZLE_BANK = [
  {
    id: 'p001',
    title: { vi: 'Xe Pháo phối hợp chiếu hết 3 nước', en: 'Rook-Cannon mate in 3' },
    fen: '3k5/4P4/4C4/9/9/9/9/9/9/3K1R3 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['f0f9', 'e9d9', 'e7e9'],
    hint: { vi: 'Xe lên chiếu, Tướng bắt buộc đi, Pháo kết thúc', en: 'Rook checks, king forced, cannon finishes' },
    analysis: [
      { step: 1, move: 'Xe f1→f10', vi: 'Xe lên hàng 10 chiếu Tướng, Tướng bắt buộc sang d10', en: 'Rook delivers check on rank 10, king forced to d10' },
      { step: 2, move: 'Tướng e10→d10', vi: 'Tướng bị buộc sang cột d', en: 'King forced to column d' },
      { step: 3, move: 'Pháo e8→e10', vi: 'Pháo chiếu hết — Tốt làm ngòi, không còn đường thoát', en: 'Cannon checkmates — soldier acts as screen, no escape' },
    ],
  },
  {
    id: 'p002',
    title: { vi: 'Mã Xe chiếu hết 3 nước', en: 'Horse-Rook mate in 3' },
    fen: '3k5/9/3N5/9/9/9/9/9/9/3K1R3 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['f0f9', 'd9d8', 'd7f8'],
    hint: { vi: 'Xe lên chiếu trước, Mã nhảy vào chốt', en: 'Rook checks first, horse jumps in to finish' },
    analysis: [
      { step: 1, move: 'Xe f1→f10', vi: 'Xe chiếu Tướng, buộc phải di chuyển', en: 'Rook checks king, forced move' },
      { step: 2, move: 'Tướng e10→d10', vi: 'Tướng trốn sang d10', en: 'King escapes to d10' },
      { step: 3, move: 'Mã d8→f9', vi: 'Mã nhảy vào f9 — chiếu hết!', en: 'Horse jumps to f9 — checkmate!' },
    ],
  },
  {
    id: 'p003',
    title: { vi: 'Đôi Pháo kết hợp 3 nước', en: 'Double cannon combo in 3' },
    fen: '3k5/9/4C4/9/9/9/9/4C4/9/3K5 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e2e9', 'd9e9', 'e7e9'],
    hint: { vi: 'Pháo dưới lên chiếu, Tướng bắt, Pháo trên ăn Tướng', en: 'Lower cannon checks, king captures, upper cannon takes' },
    analysis: [
      { step: 1, move: 'Pháo e3→e10', vi: 'Pháo dưới phóng lên hàng 10 chiếu Tướng', en: 'Lower cannon fires to rank 10, checking king' },
      { step: 2, move: 'Tướng e10 bắt Pháo', vi: 'Tướng phải ăn Pháo — không có cách khác', en: 'King must capture the cannon — forced' },
      { step: 3, move: 'Pháo e8→e10', vi: 'Pháo trên ăn Tướng — chiếu hết!', en: 'Upper cannon captures king — checkmate!' },
    ],
  },
  {
    id: 'p004',
    title: { vi: 'Xe Mã phối hợp 3 nước', en: 'Rook-Horse combo in 3' },
    fen: '4k4/9/5N3/9/9/9/9/9/4R4/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e1e9', 'e9f9', 'f7e9'],
    hint: { vi: 'Xe lên giữa cung, Tướng tránh, Mã chốt', en: 'Rook into palace center, king dodges, horse finishes' },
    analysis: [
      { step: 1, move: 'Xe e2→e10', vi: 'Xe vào giữa cung Đen chiếu Tướng', en: 'Rook enters black palace center checking king' },
      { step: 2, move: 'Tướng e10→f10', vi: 'Tướng sang f10', en: 'King moves to f10' },
      { step: 3, move: 'Mã g8→e9', vi: 'Mã nhảy e9 — chiếu hết!', en: 'Horse to e9 — checkmate!' },
    ],
  },
  {
    id: 'p005',
    title: { vi: 'Pháo Tốt chiếu hết 3 nước', en: 'Cannon-Soldier mate in 3' },
    fen: '3k5/3P1P3/4C4/9/9/9/9/9/9/3K5 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['d9e9', 'd9e9', 'e7d9'],
    hint: { vi: 'Tốt đẩy vào cung ép Tướng, Pháo kết thúc', en: 'Push soldier into palace to corner king, cannon finishes' },
    analysis: [
      { step: 1, move: 'Tốt d10→e10', vi: 'Tốt vào cung chiếu Tướng, buộc sang d10', en: 'Soldier enters palace checking, king forced to d10' },
      { step: 2, move: 'Tướng e10→d10', vi: 'Tướng sang góc d10', en: 'King cornered at d10' },
      { step: 3, move: 'Pháo e8→d8', vi: 'Pháo sang d8 chiếu hết — Tốt f10 làm ngòi', en: 'Cannon to d8 — checkmate, f10 soldier as screen' },
    ],
  },
  {
    id: 'p006',
    title: { vi: 'Đôi Xe tấn cung 3 nước', en: 'Double rook palace attack in 3' },
    fen: '3k5/9/9/9/9/9/9/9/3RR4/3K5 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['d1d9', 'd9e9', 'e1e9'],
    hint: { vi: 'Xe thứ nhất vào cung chiếu, Tướng tránh, Xe thứ hai vào chiếu hết', en: 'First rook checks palace, king dodges, second rook checkmates' },
    analysis: [
      { step: 1, move: 'Xe d2→d10', vi: 'Xe d vào hàng 10 chiếu Tướng tại e10', en: 'Rook d to rank 10, checking king at e10' },
      { step: 2, move: 'Tướng e10→f10', vi: 'Tướng tránh sang f10', en: 'King retreats to f10' },
      { step: 3, move: 'Xe e2→e10', vi: 'Xe e vào e10 chiếu hết — không còn đường thoát!', en: 'Rook e to e10 — checkmate, no escape!' },
    ],
  },
  {
    id: 'p007',
    title: { vi: 'Mã Pháo phối hợp 3 nước', en: 'Horse-Cannon combo in 3' },
    fen: '4k4/9/4C4/9/4N4/9/9/9/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e5g6', 'e9f9', 'e7e9'],
    hint: { vi: 'Mã nhảy tạo ngòi cho Pháo, Tướng sang f, Pháo bắn thẳng chiếu hết', en: 'Horse jumps to screen for cannon, king moves to f, cannon fires' },
    analysis: [
      { step: 1, move: 'Mã e6→g7', vi: 'Mã nhảy g7 — trở thành ngòi cho Pháo e8', en: 'Horse to g7 — becomes screen for cannon at e8' },
      { step: 2, move: 'Tướng e10→f10', vi: 'Tướng phải di chuyển', en: 'King forced to move' },
      { step: 3, move: 'Pháo e8→e10', vi: 'Pháo bắn thẳng chiếu hết!', en: 'Cannon fires — checkmate!' },
    ],
  },
  {
    id: 'p008',
    title: { vi: 'Sĩ bỏ ngõ — Xe chiếu hết 3 nước', en: 'Advisor removal — Rook mate in 3' },
    fen: '3ak4/4a4/9/9/9/9/9/9/4R4/3K5 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e1e8', 'd9e8', 'e1e9'],
    hint: { vi: 'Xe nhử Sĩ ra, lấy Sĩ rồi chiếu hết', en: 'Lure advisor out, capture it, then checkmate' },
    analysis: [
      { step: 1, move: 'Xe e2→e9', vi: 'Xe lên e9 uy hiếp Sĩ d9', en: 'Rook to e9, threatening advisor at d9' },
      { step: 2, move: 'Sĩ d10→e9', vi: 'Sĩ bắt buộc phải ăn Xe', en: 'Advisor forced to capture rook' },
      { step: 3, move: 'Xe (khác) e2→e10', vi: 'Xe vào e10 chiếu hết — cung Đen trống!', en: 'Rook to e10 — checkmate, palace undefended!' },
    ],
  },
  {
    id: 'p009',
    title: { vi: 'Tốt Mã ép góc 3 nước', en: 'Soldier-Horse corner mate in 3' },
    fen: '3k5/4P4/9/4N4/9/9/9/9/9/3K5 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e9d9', 'd9c9', 'd5c7'],
    hint: { vi: 'Tốt đuổi Tướng vào góc, Mã nhảy chiếu hết', en: 'Soldier chases king to corner, horse delivers mate' },
    analysis: [
      { step: 1, move: 'Tốt e10→d10', vi: 'Tốt sang d10 chiếu Tướng, Tướng bị đuổi vào góc', en: 'Soldier to d10 checks, king chased to corner' },
      { step: 2, move: 'Tướng d10→c10', vi: 'Tướng vào góc c10 không còn đường', en: 'King cornered at c10' },
      { step: 3, move: 'Mã d6→c8', vi: 'Mã nhảy c8 — chiếu hết!', en: 'Horse to c8 — checkmate!' },
    ],
  },
  {
    id: 'p010',
    title: { vi: 'Xe Pháo Tốt phối hợp 3 nước', en: 'Rook-Cannon-Soldier in 3' },
    fen: '3k5/4P4/4C4/9/9/9/9/9/9/3KR4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e0f0', 'e9d9', 'd9d0'],
    hint: { vi: 'Tướng sang f mở đường, Pháo chiếu hết qua Tốt làm ngòi', en: 'General moves to f to open file, cannon mates through soldier screen' },
    analysis: [
      { step: 1, move: 'Xe e1→f1', vi: 'Xe sang f1, mở cột e cho Pháo', en: 'Rook to f1, opening e-file for cannon' },
      { step: 2, move: 'Tướng e10→d10', vi: 'Tướng tránh sang d10', en: 'King retreats to d10' },
      { step: 3, move: 'Pháo e8→d8', vi: 'Pháo sang d8 — chiếu hết qua Tốt e10!', en: 'Cannon to d8 — checkmate through soldier screen at e10!' },
    ],
  },
  {
    id: 'p011',
    title: { vi: 'Xe chiếu liên tiếp 3 nước', en: 'Consecutive rook checks in 3' },
    fen: '9/4k4/9/9/9/9/9/9/3R5/3K5 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['d1d8', 'e8e9', 'd8d9'],
    hint: { vi: 'Xe chiếu liên tiếp đẩy Tướng vào góc cuối', en: 'Consecutive checks drive king to the edge' },
    analysis: [
      { step: 1, move: 'Xe d2→d9', vi: 'Xe lên d9 chiếu Tướng e9', en: 'Rook to d9 checking king at e9' },
      { step: 2, move: 'Tướng e9→e10', vi: 'Tướng lên hàng 10', en: 'King retreats to rank 10' },
      { step: 3, move: 'Xe d9→d10', vi: 'Xe lên d10 — chiếu hết! Tướng không có đường thoát', en: 'Rook to d10 — checkmate! No escape for king' },
    ],
  },
  {
    id: 'p012',
    title: { vi: 'Pháo Mã phối hợp 3 nước', en: 'Cannon-Horse coordination in 3' },
    fen: '4k4/9/4C4/9/9/3N5/9/9/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['d4f5', 'e9d9', 'e7e9'],
    hint: { vi: 'Mã nhảy tạo ngòi, Tướng trốn, Pháo chiếu hết', en: 'Horse creates screen, king flees, cannon mates' },
    analysis: [
      { step: 1, move: 'Mã d5→f6', vi: 'Mã nhảy f6 — trở thành ngòi cho Pháo e8', en: 'Horse to f6 — acts as screen for cannon at e8' },
      { step: 2, move: 'Tướng e10→d10', vi: 'Tướng tránh sang d10', en: 'King dodges to d10' },
      { step: 3, move: 'Pháo e8→e10', vi: 'Pháo bắn thẳng qua ngòi f6 chiếu hết!', en: 'Cannon fires through f6 screen — checkmate!' },
    ],
  },
  {
    id: 'p013',
    title: { vi: 'Đôi Xe tấn trực tiếp 3 nước', en: 'Double rook direct attack in 3' },
    fen: '4k4/9/9/9/9/9/9/3RR4/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e2e9', 'e9f9', 'd2d9'],
    hint: { vi: 'Xe e vào cung chiếu, Tướng tránh, Xe d vào chiếu hết', en: 'Rook e checks in palace, king dodges, rook d mates' },
    analysis: [
      { step: 1, move: 'Xe e3→e10', vi: 'Xe e vào e10 chiếu', en: 'Rook e to e10, check' },
      { step: 2, move: 'Tướng e10→f10', vi: 'Tướng tránh sang f10', en: 'King escapes to f10' },
      { step: 3, move: 'Xe d3→d10', vi: 'Xe d vào d10 — chiếu hết! Không còn đường', en: 'Rook d to d10 — checkmate! No escape' },
    ],
  },
  {
    id: 'p014',
    title: { vi: 'Xe Pháo kép chiếu 3 nước', en: 'Rook-Cannon double check in 3' },
    fen: '3k5/9/4C4/9/9/9/9/9/4R4/3K5 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    solution: ['e1e8', 'd9e9', 'e7e9'],
    hint: { vi: 'Xe lên nhử Sĩ, Tướng ra lộ, Pháo chiếu hết', en: 'Rook lures advisor, king exposed, cannon checkmates' },
    analysis: [
      { step: 1, move: 'Xe e2→e9', vi: 'Xe nhử vào e9, đe doạ chiếu hết ngay', en: 'Rook to e9, threatening immediate mate' },
      { step: 2, move: 'Tướng d10→e10', vi: 'Tướng buộc phải ra chặn', en: 'King forced to block at e10' },
      { step: 3, move: 'Pháo e8→e10', vi: 'Pháo chiếu hết qua Xe e9 làm ngòi!', en: 'Cannon mates through rook screen at e9!' },
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
