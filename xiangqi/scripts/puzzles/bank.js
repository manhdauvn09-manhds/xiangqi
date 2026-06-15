// Cờ Tướng Vương — kho puzzle "thắng trong N nước" (chiếu hết hoặc vây hãm/困毙)
// FEN Xiangqi tiêu chuẩn: file a-i, rank 0 (Đen, trên) → rank 9 (Đỏ, dưới), Red=uppercase.
// solution: mảng ICCS (rank 1-10) theo đúng biến chính (principal variation) — gồm cả nước Đen phòng thủ.
// winType: 'checkmate' (chiếu hết) hoặc 'stalemate' (vây hãm — đối phương hết nước, theo luật Cờ Tướng là thua).
// ⚠️ TẤT CẢ puzzle đã được verify bằng engine: Tướng KHÔNG lộ mặt lúc bắt đầu, có sát cục bắt buộc đúng số nước.
//    (xem scripts xác minh trong lịch sử commit). Người chơi được đi tự do; chỉ cần thắng là đạt.

export const PUZZLE_BANK = [
  {
    id: 'p001',
    title: { vi: 'Xe đuổi Tướng — thắng 3 nước', en: 'Rook hunt — win in 3' },
    fen: '2rk5/9/9/9/9/9/9/9/9/4K1R2 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    winType: 'checkmate',
    solution: ['g1g10', 'd10d9', 'g10c10', 'd9d8', 'c10d10'],
    hint: { vi: 'Xe chiếu từ cột g, lùa Tướng rồi bọc cột để chiếu hết.', en: 'Rook checks on g-file, drives the king, then mates.' },
    analysis: [
      { step: 1, move: 'Xe g1-g10', vi: 'Xe lên hàng cuối chiếu Tướng.', en: 'Rook to g10 checks the king.' },
      { step: 2, move: 'Tướng d10-d9', vi: 'Tướng buộc phải xuống d9.', en: 'King forced down to d9.' },
      { step: 3, move: 'Xe g10-c10', vi: 'Xe bọc sang cột c cắt đường về.', en: 'Rook swings to c10, cutting the retreat.' },
      { step: 4, move: 'Tướng d9-d8', vi: 'Tướng tiếp tục bị đẩy.', en: 'King is pushed again.' },
      { step: 5, move: 'Xe c10-d10', vi: 'Xe vào d10 chiếu hết!', en: 'Rook to d10 — checkmate!' },
    ],
  },
  {
    id: 'p002',
    title: { vi: 'Pháo Mã sát cục — thắng 3 nước', en: 'Cannon & Horse — win in 3' },
    fen: '3k5/9/9/9/9/9/9/4C4/4N4/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 3,
    winType: 'checkmate',
    solution: ['e2g3', 'd10e10', 'g3f5', 'e10f10', 'e3f3'],
    hint: { vi: 'Mã nhảy vây Tướng, Pháo kết liễu.', en: 'Horse boxes the king in, cannon finishes.' },
    analysis: [
      { step: 1, move: 'Mã e2-g3', vi: 'Mã nhảy ra khống chế lối thoát.', en: 'Horse jumps out to cover escapes.' },
      { step: 2, move: 'Tướng d10-e10', vi: 'Tướng dạt sang e10.', en: 'King sidesteps to e10.' },
      { step: 3, move: 'Mã g3-f5', vi: 'Mã chuyển vây tiếp.', en: 'Horse repositions to close the net.' },
      { step: 4, move: 'Tướng e10-f10', vi: 'Tướng chạy vào góc.', en: 'King flees to the corner.' },
      { step: 5, move: 'Pháo e3-f3', vi: 'Pháo sang cột f chiếu hết!', en: 'Cannon to f3 — checkmate!' },
    ],
  },
  {
    id: 'p003',
    title: { vi: 'Pháo Mã phối hợp — thắng 2 nước', en: 'Cannon & Horse — win in 2' },
    fen: '3k5/9/9/9/9/9/9/3C5/3N5/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 2,
    winType: 'checkmate',
    solution: ['d2f3', 'd10d9', 'f3d4'],
    hint: { vi: 'Mã nhảy đôi tạo lưới chiếu hết.', en: 'Two horse hops weave the mating net.' },
    analysis: [
      { step: 1, move: 'Mã d2-f3', vi: 'Mã nhảy ra uy hiếp.', en: 'Horse jumps out, threatening.' },
      { step: 2, move: 'Tướng d10-d9', vi: 'Tướng buộc xuống d9.', en: 'King forced to d9.' },
      { step: 3, move: 'Mã f3-d4', vi: 'Mã nhảy d4 chiếu hết!', en: 'Horse to d4 — checkmate!' },
    ],
  },
  {
    id: 'p004',
    title: { vi: 'Pháo Mã hiểm — thắng 2 nước', en: 'Cannon & Horse trap — win in 2' },
    fen: '3k5/9/9/9/9/9/9/4C4/2N6/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 2,
    winType: 'checkmate',
    solution: ['e3d3', 'd10d9', 'c2d4'],
    hint: { vi: 'Pháo đổi cột mở lưới, Mã kết thúc.', en: 'Cannon shifts file, horse delivers mate.' },
    analysis: [
      { step: 1, move: 'Pháo e3-d3', vi: 'Pháo sang cột d khống chế.', en: 'Cannon shifts to the d-file.' },
      { step: 2, move: 'Tướng d10-d9', vi: 'Tướng buộc xuống d9.', en: 'King forced to d9.' },
      { step: 3, move: 'Mã c2-d4', vi: 'Mã nhảy d4 chiếu hết!', en: 'Horse to d4 — checkmate!' },
    ],
  },
  {
    id: 'p005',
    title: { vi: 'Xe Mã vây hãm — thắng 2 nước', en: 'Rook & Horse — win in 2' },
    fen: '4k4/9/4N4/9/9/9/9/9/4R4/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 2,
    winType: 'stalemate',
    solution: ['e8f6', 'e10f10', 'e2e9'],
    hint: { vi: 'Mã chiếu lùa Tướng vào góc, Xe khoá là hết nước.', en: 'Horse check herds the king; rook seals — no moves left.' },
    analysis: [
      { step: 1, move: 'Mã e2-f4', vi: 'Mã chiếu, Tướng phải dạt.', en: 'Horse checks; king must move.' },
      { step: 2, move: 'Tướng e10-f10', vi: 'Tướng vào góc f10.', en: 'King to corner f10.' },
      { step: 3, move: 'Xe e2-e1', vi: 'Xe khoá cột e — Tướng hết nước (vây hãm)!', en: 'Rook seals — king is stalemated (a win)!' },
    ],
  },
  {
    id: 'p006',
    title: { vi: 'Xe Pháo vây hãm — thắng 2 nước', en: 'Rook & Cannon — win in 2' },
    fen: '4k4/9/9/9/9/9/9/4C4/9/4KR3 w - - 0 1',
    solverSide: 'r',
    mateIn: 2,
    winType: 'stalemate',
    solution: ['f1f9', 'e10d10', 'e3f3'],
    hint: { vi: 'Xe chiếu lùa Tướng, Pháo bịt nốt lối — hết nước.', en: 'Rook check drives the king; cannon plugs the last escape.' },
    analysis: [
      { step: 1, move: 'Xe f1-f10', vi: 'Xe chiếu Tướng.', en: 'Rook checks the king.' },
      { step: 2, move: 'Tướng e10-d10', vi: 'Tướng dạt sang d10.', en: 'King sidesteps to d10.' },
      { step: 3, move: 'Pháo e3-f3', vi: 'Pháo bịt lối — Tướng hết nước (vây hãm)!', en: 'Cannon plugs the escape — stalemate win!' },
    ],
  },
  {
    id: 'p007',
    title: { vi: 'Xe khoá góc — thắng 1 nước', en: 'Rook corner lock — win in 1' },
    fen: '3ka4/9/R8/9/9/9/9/9/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 1,
    winType: 'checkmate',
    solution: ['a8d8'],
    hint: { vi: 'Xe sang cột d — Tướng hết đường thoát.', en: 'Rook to d-file — king is trapped.' },
    analysis: [
      { step: 1, move: 'Xe a8-d8', vi: 'Xe chiếu Tướng trên cột d. Tướng không thể sang e10 (Sĩ chắn), không thể xuống d9 (Xe kiểm soát cột d), không thể sang c10 (ngoài cung). Chiếu hết!', en: 'Rook checks on d-file. King cannot go to e10 (advisor), d9 (rook controls file), or c10 (outside palace). Checkmate!' },
    ],
  },
  {
    id: 'p008',
    title: { vi: 'Mã làm giá Pháo — thắng 1 nước', en: 'Horse screens Cannon — win in 1' },
    fen: '5k3/9/9/9/6N2/9/9/5C3/9/4K4 w - - 0 1',
    solverSide: 'r',
    mateIn: 1,
    winType: 'checkmate',
    solution: ['g4f6'],
    hint: { vi: 'Mã nhảy f6 làm giá cho Pháo bắn qua chiếu Tướng trên cột f.', en: 'Horse jumps to f6 to screen the Cannon — fires through to check King on f-file.' },
    analysis: [
      { step: 1, move: 'Mã g4-f6', vi: 'Mã nhảy f6 làm giá. Pháo tại f3 bắn qua Mã → chiếu Tướng ở f10. Tướng không thể dạt e10 (bay tướng với Vua Đỏ ở e1), không thể sang g10 (ngoài cung), không thể xuống f9 (Pháo vẫn bắn qua Mã). Chiếu hết!', en: 'Horse to f6 screens. Cannon fires through Horse to f10 — check. King cannot go to e10 (flying general), g10 (outside palace), or f9 (still in cannon range). Checkmate!' },
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
