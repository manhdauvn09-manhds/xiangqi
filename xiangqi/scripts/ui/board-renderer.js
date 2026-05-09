// Cờ Tướng Vương — render bàn cờ bằng SVG, click handling
import { BOARD_W, BOARD_H, HAN } from '../core/constants.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Layout constants — bàn 540×600 (margin 30 mỗi cạnh, ô 60×60)
const PAD = 30;
const STEP = 60;

/**
 * Tạo BoardRenderer.
 * @param container HTMLElement chứa SVG
 * @param onSquareClick (file, rank) => void
 * @param opts.flipped bool — hiển thị từ góc nhìn Đen
 */
export function createBoardRenderer(container, onSquareClick, opts = {}) {
  const state = {
    flipped: !!opts.flipped,
    board: null,
    selected: null,        // {file, rank}
    legalTargets: [],      // [{file, rank}]
    lastMove: null,        // {from, to}
    inCheck: null,         // {file, rank} — Tướng đang bị chiếu
  };

  // Tạo SVG
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 540 600');
  svg.setAttribute('class', 'xq-board');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  container.innerHTML = '';
  container.appendChild(svg);

  // Layers
  const lyBg       = group('xq-bg');
  const lyHilite   = group('xq-hilite');
  const lyLegal    = group('xq-legal');
  const lyPieces   = group('xq-pieces');
  const lyOverlay  = group('xq-overlay');
  svg.appendChild(lyBg);
  svg.appendChild(lyHilite);
  svg.appendChild(lyLegal);
  svg.appendChild(lyPieces);
  svg.appendChild(lyOverlay);

  drawBoardLines(lyBg);

  // Click overlay (1 transparent rect cho mỗi ô)
  const lyClick = group('xq-clickable');
  svg.appendChild(lyClick);
  for (let f = 0; f < BOARD_W; f++) {
    for (let r = 0; r < BOARD_H; r++) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      const [x, y] = squareXY(f, r, state.flipped);
      rect.setAttribute('x', x - 28);
      rect.setAttribute('y', y - 28);
      rect.setAttribute('width', 56);
      rect.setAttribute('height', 56);
      rect.setAttribute('fill', 'transparent');
      rect.setAttribute('class', 'xq-click');
      rect.dataset.file = f;
      rect.dataset.rank = r;
      rect.addEventListener('click', () => onSquareClick && onSquareClick(f, r));
      lyClick.appendChild(rect);
    }
  }

  function setBoard(board) {
    state.board = board;
    redraw();
  }

  function setSelected(sq, legalTargets = []) {
    state.selected = sq;
    state.legalTargets = legalTargets;
    redrawHilite();
    redrawLegal();
  }

  function setLastMove(move) {
    state.lastMove = move;
    redrawHilite();
  }

  function setInCheck(sq) {
    state.inCheck = sq;
    redrawOverlay();
  }

  function flip() {
    state.flipped = !state.flipped;
    // Reposition click handlers
    [...lyClick.children].forEach(rect => {
      const f = +rect.dataset.file, r = +rect.dataset.rank;
      const [x, y] = squareXY(f, r, state.flipped);
      rect.setAttribute('x', x - 28);
      rect.setAttribute('y', y - 28);
    });
    redraw();
  }

  function redraw() {
    redrawPieces();
    redrawHilite();
    redrawLegal();
    redrawOverlay();
  }

  function redrawPieces() {
    lyPieces.innerHTML = '';
    if (!state.board) return;
    for (let f = 0; f < BOARD_W; f++) {
      for (let r = 0; r < BOARD_H; r++) {
        const p = state.board.squares[f][r];
        if (!p) continue;
        lyPieces.appendChild(drawPiece(p, f, r, state.flipped));
      }
    }
  }

  function redrawHilite() {
    lyHilite.innerHTML = '';
    if (state.lastMove) {
      const [fx, fy] = squareXY(state.lastMove.from.file, state.lastMove.from.rank, state.flipped);
      const [tx, ty] = squareXY(state.lastMove.to.file,   state.lastMove.to.rank,   state.flipped);
      lyHilite.appendChild(squareHilite(fx, fy, 'last-from'));
      lyHilite.appendChild(squareHilite(tx, ty, 'last-to'));
    }
    if (state.selected) {
      const [x, y] = squareXY(state.selected.file, state.selected.rank, state.flipped);
      lyHilite.appendChild(squareHilite(x, y, 'sel'));
    }
  }

  function redrawLegal() {
    lyLegal.innerHTML = '';
    if (!state.board) return;
    for (const t of state.legalTargets) {
      const [x, y] = squareXY(t.file, t.rank, state.flipped);
      const target = state.board.squares[t.file][t.rank];
      if (target) {
        // capture indicator: ring đỏ
        const ring = document.createElementNS(SVG_NS, 'circle');
        ring.setAttribute('cx', x);
        ring.setAttribute('cy', y);
        ring.setAttribute('r', 26);
        ring.setAttribute('class', 'xq-target-capture');
        lyLegal.appendChild(ring);
      } else {
        // dot jade
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', 8);
        dot.setAttribute('class', 'xq-target-dot');
        lyLegal.appendChild(dot);
      }
    }
  }

  function redrawOverlay() {
    lyOverlay.innerHTML = '';
    if (state.inCheck) {
      const [x, y] = squareXY(state.inCheck.file, state.inCheck.rank, state.flipped);
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', x);
      c.setAttribute('cy', y);
      c.setAttribute('r', 30);
      c.setAttribute('class', 'xq-check-pulse');
      lyOverlay.appendChild(c);
    }
  }

  return { svg, setBoard, setSelected, setLastMove, setInCheck, flip, getFlipped: () => state.flipped };
}

// ─────────────── helpers ───────────────

function group(cls) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', cls);
  return g;
}

/** Lấy toạ độ pixel cho ô (file, rank). Nếu flipped, đảo. */
function squareXY(file, rank, flipped) {
  const f = flipped ? BOARD_W - 1 - file : file;
  const r = flipped ? BOARD_H - 1 - rank : rank;
  return [PAD + f * STEP, PAD + r * STEP];
}

function squareHilite(cx, cy, kind) {
  const g = document.createElementNS(SVG_NS, 'g');
  let cls = 'xq-hilite';
  if (kind === 'sel') cls += ' xq-hilite-sel';
  else if (kind === 'last-to') cls += ' xq-hilite-last-to';
  else if (kind === 'last-from') cls += ' xq-hilite-last-from';
  else cls += ' xq-hilite-last';
  g.setAttribute('class', cls);

  // Inner circle (radius 20)
  const c1 = document.createElementNS(SVG_NS, 'circle');
  c1.setAttribute('cx', cx);
  c1.setAttribute('cy', cy);
  c1.setAttribute('r', 20);
  c1.setAttribute('class', 'xq-hilite-ring');
  g.appendChild(c1);

  // Outer circle (radius 30)
  const c2 = document.createElementNS(SVG_NS, 'circle');
  c2.setAttribute('cx', cx);
  c2.setAttribute('cy', cy);
  c2.setAttribute('r', 30);
  c2.setAttribute('class', 'xq-hilite-ring');
  g.appendChild(c2);

  return g;
}

function drawPiece(piece, file, rank, flipped) {
  const [cx, cy] = squareXY(file, rank, flipped);
  const g = document.createElementNS(SVG_NS, 'g');
  const sideClass = piece.hidden ? 'xq-piece-hidden' : `xq-piece-${piece.side}`;
  g.setAttribute('class', `xq-piece ${sideClass}`);
  g.setAttribute('transform', `translate(${cx} ${cy})`);

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('r', 26);
  circle.setAttribute('class', piece.hidden ? 'xq-piece-bg-hidden' : 'xq-piece-bg');
  g.appendChild(circle);

  if (piece.hidden) {
    // Mặt sau: pattern cờ úp (vòng tròn + chấm trung tâm)
    const inner = document.createElementNS(SVG_NS, 'circle');
    inner.setAttribute('r', 18);
    inner.setAttribute('class', 'xq-piece-back-ring');
    g.appendChild(inner);
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', 4);
    dot.setAttribute('class', 'xq-piece-back-dot');
    g.appendChild(dot);
    return g;
  }

  const inner = document.createElementNS(SVG_NS, 'circle');
  inner.setAttribute('r', 22);
  inner.setAttribute('class', 'xq-piece-ring');
  g.appendChild(inner);

  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'central');
  t.setAttribute('class', `xq-piece-text xq-piece-text-${piece.side}`);
  t.textContent = HAN[piece.type][piece.side];
  g.appendChild(t);
  return g;
}

function drawBoardLines(lyBg) {
  // background paper (CSS sẽ tô màu thực bằng class)
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', '540');
  bg.setAttribute('height', '600');
  bg.setAttribute('class', 'xq-board-bg');
  lyBg.appendChild(bg);

  // outer border
  const border = document.createElementNS(SVG_NS, 'rect');
  border.setAttribute('x', 30);
  border.setAttribute('y', 30);
  border.setAttribute('width', 480);
  border.setAttribute('height', 540);
  border.setAttribute('class', 'xq-board-border');
  border.setAttribute('fill', 'none');
  lyBg.appendChild(border);

  // file lines (cột) — bị cắt ở sông (rank 4..5)
  for (let f = 0; f < BOARD_W; f++) {
    const x = PAD + f * STEP;
    if (f === 0 || f === BOARD_W - 1) {
      // 2 cột biên kẻ liền
      lyBg.appendChild(line(x, 30, x, 570));
    } else {
      lyBg.appendChild(line(x, 30, x, 30 + 4 * STEP));
      lyBg.appendChild(line(x, 30 + 5 * STEP, x, 570));
    }
  }
  // rank lines (hàng)
  for (let r = 0; r < BOARD_H; r++) {
    const y = PAD + r * STEP;
    lyBg.appendChild(line(30, y, 510, y));
  }
  // palaces (cung)
  // top palace: cột 3-5, hàng 0-2
  lyBg.appendChild(line(PAD + 3*STEP, PAD,            PAD + 5*STEP, PAD + 2*STEP));
  lyBg.appendChild(line(PAD + 5*STEP, PAD,            PAD + 3*STEP, PAD + 2*STEP));
  // bottom palace: cột 3-5, hàng 7-9
  lyBg.appendChild(line(PAD + 3*STEP, PAD + 7*STEP,   PAD + 5*STEP, PAD + 9*STEP));
  lyBg.appendChild(line(PAD + 5*STEP, PAD + 7*STEP,   PAD + 3*STEP, PAD + 9*STEP));

  // River text
  const txt1 = document.createElementNS(SVG_NS, 'text');
  txt1.setAttribute('x', 135); txt1.setAttribute('y', 305);
  txt1.setAttribute('class', 'xq-river-text');
  txt1.textContent = '楚 河';
  lyBg.appendChild(txt1);
  const txt2 = document.createElementNS(SVG_NS, 'text');
  txt2.setAttribute('x', 345); txt2.setAttribute('y', 305);
  txt2.setAttribute('class', 'xq-river-text');
  txt2.textContent = '漢 界';
  lyBg.appendChild(txt2);

  // Position dots (chữ thập nhỏ cho điểm Tốt và Pháo) — visual only
  const dots = [
    [0, 3], [2, 3], [4, 3], [6, 3], [8, 3],   // Tốt Đen
    [1, 2], [7, 2],                            // Pháo Đen
    [0, 6], [2, 6], [4, 6], [6, 6], [8, 6],   // Tốt Đỏ
    [1, 7], [7, 7],                            // Pháo Đỏ
  ];
  for (const [f, r] of dots) {
    const x = PAD + f * STEP, y = PAD + r * STEP;
    drawPositionMarker(lyBg, x, y, f === 0, f === BOARD_W - 1);
  }
}

function line(x1, y1, x2, y2) {
  const l = document.createElementNS(SVG_NS, 'line');
  l.setAttribute('x1', x1); l.setAttribute('y1', y1);
  l.setAttribute('x2', x2); l.setAttribute('y2', y2);
  l.setAttribute('class', 'xq-board-line');
  return l;
}

/** Vẽ dấu chữ thập "凸" tại mỗi điểm chiến lược. */
function drawPositionMarker(lyBg, x, y, leftEdge, rightEdge) {
  const len = 5, gap = 4;
  const segs = [];
  if (!leftEdge)  segs.push([x - gap - len, y - gap, x - gap, y - gap], [x - gap, y - gap - len, x - gap, y - gap], [x - gap - len, y + gap, x - gap, y + gap], [x - gap, y + gap + len, x - gap, y + gap]);
  if (!rightEdge) segs.push([x + gap, y - gap, x + gap + len, y - gap], [x + gap, y - gap - len, x + gap, y - gap], [x + gap, y + gap, x + gap + len, y + gap], [x + gap, y + gap, x + gap, y + gap + len]);
  for (const s of segs) lyBg.appendChild(line(...s));
}
