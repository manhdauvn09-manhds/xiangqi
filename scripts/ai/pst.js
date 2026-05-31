// Cờ Tướng Vương — Piece-Square Tables
// Bảng điểm vị trí cho mỗi loại quân (góc nhìn Đỏ — bên Đen sẽ lấy mirror dọc).
// Đơn vị: centipawn. Tổng eval = material + sum(PST[type][file][rank]).
//
// Format: PST[type][rank][file]  // 10 hàng × 9 cột
// Hàng 0 = tận cùng phía Đen, hàng 9 = đáy Đỏ.
//
// Note: các bảng dưới được điều chỉnh tay theo kinh nghiệm cờ tướng — không phải
// optimal nhưng đủ để bot đánh "có hồn".

export const MATERIAL = Object.freeze({
  K: 10000,
  A: 200,
  E: 200,
  H: 400,
  R: 900,
  C: 450,
  P: 100,
});

// Mỗi PST là mảng 10×9. Ta viết theo cách hàng 0..9 từ Đen → Đỏ.
const ZERO_ROW = [0,0,0,0,0,0,0,0,0];

// Tướng — khuyến khích ở giữa cung
export const PST_K = [
  [0,0,0, 1, 5, 1, 0,0,0],
  [0,0,0, 8, 8, 8, 0,0,0],
  [0,0,0, 9, 9, 9, 0,0,0],
  ZERO_ROW, ZERO_ROW, ZERO_ROW, ZERO_ROW,
  [0,0,0, 9, 9, 9, 0,0,0],
  [0,0,0, 8, 8, 8, 0,0,0],
  [0,0,0, 1, 5, 1, 0,0,0],
];

// Sĩ
export const PST_A = [
  [0,0,0, 0, 3, 0, 0,0,0],
  [0,0,0, 0, 0, 0, 0,0,0],
  [0,0,0, 3, 0, 3, 0,0,0],
  ZERO_ROW, ZERO_ROW, ZERO_ROW, ZERO_ROW,
  [0,0,0, 3, 0, 3, 0,0,0],
  [0,0,0, 0, 0, 0, 0,0,0],
  [0,0,0, 0, 3, 0, 0,0,0],
];

// Tượng — hơi ưu tiên trục giữa, không qua sông
export const PST_E = [
  [0,0,2, 0, 0, 0, 2,0,0],
  ZERO_ROW,
  [0,0,3, 0, 5, 0, 3,0,0],
  ZERO_ROW,
  [0,0,3, 0, 5, 0, 3,0,0],
  [0,0,3, 0, 5, 0, 3,0,0],
  ZERO_ROW,
  [0,0,3, 0, 5, 0, 3,0,0],
  ZERO_ROW,
  [0,0,2, 0, 0, 0, 2,0,0],
];

// Mã — mạnh ở trung tâm, vào trận tốt khi nhảy ra cột d/f
export const PST_H = [
  [ 4,  8,  8,  8,  8,  8,  8,  8,  4],
  [ 8, 16, 16, 16, 16, 16, 16, 16,  8],
  [ 8, 16, 22, 22, 22, 22, 22, 16,  8],
  [ 8, 16, 22, 30, 30, 30, 22, 16,  8],
  [ 8, 16, 22, 30, 38, 30, 22, 16,  8],
  [ 8, 16, 22, 30, 38, 30, 22, 16,  8],
  [ 8, 16, 22, 30, 30, 30, 22, 16,  8],
  [ 8, 16, 22, 22, 22, 22, 22, 16,  8],
  [ 8, 16, 16, 16, 16, 16, 16, 16,  8],
  [ 4,  8,  8,  8,  8,  8,  8,  8,  4],
];

// Xe — ưu tiên cột thoáng, vào sâu
export const PST_R = [
  [14, 14, 12, 18, 16, 18, 12, 14, 14],
  [16, 20, 18, 24, 26, 24, 18, 20, 16],
  [12, 12, 12, 18, 18, 18, 12, 12, 12],
  [12, 18, 16, 22, 22, 22, 16, 18, 12],
  [12, 14, 12, 18, 18, 18, 12, 14, 12],
  [12, 16, 14, 20, 20, 20, 14, 16, 12],
  [ 6,  6,  6, 12, 14, 12,  6,  6,  6],
  [ 4,  8,  6, 14, 12, 14,  6,  8,  4],
  [ 8,  4,  8, 16, 18, 16,  8,  4,  8],
  [-2, 10,  6, 14, 12, 14,  6, 10, -2],
];

// Pháo — mạnh khi chiếm cột giữa với ngòi
export const PST_C = [
  [ 6,  4,  0,-10,-12,-10,  0,  4,  6],
  [ 2,  2,  0, -4,-14, -4,  0,  2,  2],
  [ 2,  2,  0,-10, -8,-10,  0,  2,  2],
  [ 0,  0, -2,  4, 10,  4, -2,  0,  0],
  [ 0,  0,  0,  2,  8,  2,  0,  0,  0],
  [-2,  0,  4,  2,  6,  2,  4,  0, -2],
  [ 0,  0,  0,  2,  4,  2,  0,  0,  0],
  [ 4,  0,  8,  6, 10,  6,  8,  0,  4],
  [ 0,  2,  4,  6,  6,  6,  4,  2,  0],
  [ 0,  0,  2,  6,  6,  6,  2,  0,  0],
];

// Tốt — qua sông giá trị tăng
export const PST_P = [
  [  0,  0,  0,  2,  4,  2,  0,  0,  0],
  [ 20, 30, 50, 65, 70, 65, 50, 30, 20],
  [ 20, 30, 45, 55, 55, 55, 45, 30, 20],
  [ 20, 27, 30, 40, 42, 40, 30, 27, 20],
  [  0, 18,  0, 16,  0, 16,  0, 18,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
];

const PST = { K: PST_K, A: PST_A, E: PST_E, H: PST_H, R: PST_R, C: PST_C, P: PST_P };

/** Lấy điểm vị trí cho 1 quân tại (file, rank). Đỏ đọc thẳng, Đen mirror rank. */
export function pstScore(piece, file, rank) {
  const table = PST[piece.type];
  if (!table) return 0;
  const r = piece.side === 'r' ? rank : (9 - rank);
  return table[r][file] | 0;
}
