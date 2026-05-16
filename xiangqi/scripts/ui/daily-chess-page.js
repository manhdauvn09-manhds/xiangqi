/**
 * Daily Chess Puzzle — Interactive board with 6 states
 * Uses chess-mini.js for FEN/SAN logic
 */
import { getDailyChessPuzzle, getLevel, getStreak, completePuzzle, skipPuzzle as savePuzzleSkip } from '../puzzles/chess-bank.js';
import { parseFen, PIECE_SYMBOLS, sqToCoord, coordToSq, applyMoveSan, checkUserMove, getMoveSquares, getMovablePieces } from '../chess/chess-mini.js';
import { toast } from './toast.js';

// ─── Board colors ───────────────────────────────────────────
const LIGHT      = '#f0d9b5';
const DARK       = '#b58863';
const HL_SELECT  = 'rgba(20,85,255,0.45)';
const HL_HINT    = 'rgba(255,210,0,0.65)';
const HL_CORRECT = 'rgba(50,205,50,0.55)';
const HL_WRONG   = 'rgba(220,50,50,0.55)';
const HL_LAST    = 'rgba(155,199,0,0.4)';

export function renderDailyChessPage(root) {
  const puzzle = getDailyChessPuzzle(new Date());
  if (!puzzle) {
    root.innerHTML = `<div style="padding:40px;text-align:center;color:#fff"><h2>No puzzle available</h2></div>`;
    return;
  }

  const startTime = Date.now();
  let position   = parseFen(puzzle.fen);
  let stepIndex  = 0;        // which solution move user needs to play
  let selected   = null;     // { file, rank } currently selected piece
  let hintUsed   = false;
  let highlights = {};       // sq → color overlay
  let lastMove   = null;     // { from:'e2', to:'e4' }
  let isFlipped  = false;
  let solved     = false;

  // ─── Root ─────────────────────────────────────────────────
  root.innerHTML = '';
  root.style.cssText = `
    background:#1a1a2e; min-height:100vh;
    display:flex; flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#fff;
  `;

  // ── Header ─────────────────────────────────────────────────
  const header = mk('div', `
    display:flex; justify-content:space-between; align-items:center;
    padding:10px 16px;
    background:rgba(255,255,255,0.05);
    border-bottom:1px solid rgba(255,255,255,0.1);
    flex-shrink:0;
  `);
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <a href="#/" style="color:#aaa;font-size:22px;text-decoration:none;line-height:1">←</a>
      <div>
        <div style="font-weight:700;font-size:14px">♟️ Chess Daily</div>
        <div style="font-size:11px;color:#aaa">${esc(puzzle.opening)} · ${esc(puzzle.theme)}</div>
      </div>
    </div>
    <div style="text-align:right;font-size:12px;color:#aaa">
      <div>🔥 <b style="color:#fff">${getStreak()}</b> day streak</div>
      <div>Level <b style="color:#fff">${getLevel()}/100</b></div>
    </div>
  `;

  // ── Banner ─────────────────────────────────────────────────
  const banner = mk('div', `
    padding:9px 16px; font-size:13px; font-weight:600; text-align:center;
    flex-shrink:0; min-height:38px; display:flex; align-items:center; justify-content:center;
    transition:background 0.3s, color 0.3s;
  `);

  // ── Puzzle info chips ──────────────────────────────────────
  const infoBar = mk('div', 'padding:6px 16px; display:flex; gap:6px; flex-wrap:wrap; flex-shrink:0;');
  infoBar.innerHTML = `
    <span style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;font-size:12px">
      ⭐ ${puzzle.rating}
    </span>
    <span style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;font-size:12px">
      ${esc(puzzle.title)}
    </span>
  `;

  // ── Board area ─────────────────────────────────────────────
  const boardWrap = mk('div', `
    flex:1; display:flex; align-items:center; justify-content:center;
    padding:8px; min-height:0; position:relative;
  `);

  // ── Analysis (hidden until solved) ─────────────────────────
  const analysisEl = mk('div', `
    padding:0 16px; max-height:0; overflow:hidden;
    transition:max-height 0.4s ease; flex-shrink:0;
  `);

  // ── Action buttons ─────────────────────────────────────────
  const actBar = mk('div', `
    display:flex; justify-content:center; gap:8px;
    padding:10px 16px 16px; flex-shrink:0;
    border-top:1px solid rgba(255,255,255,0.08);
    flex-wrap:wrap;
  `);
  const btnHint = btn('💡 Hint',  '#f4c430', '#000');
  const btnSkip = btn('⏭️ Skip',  'rgba(255,255,255,0.12)', '#fff');
  const btnFlip = btn('🔁 Flip',  'rgba(255,255,255,0.08)', '#fff');
  const btnFS   = btn('⛶',        'rgba(255,255,255,0.08)', '#fff');
  actBar.append(btnHint, btnSkip, btnFlip, btnFS);

  // ── Assemble ──────────────────────────────────────────────
  root.append(header, banner, infoBar, boardWrap, analysisEl, actBar);

  // Build & render board
  const { boardEl, renderPosition } = buildBoard();
  boardWrap.appendChild(boardEl);
  setStatus('playing');
  renderPosition(position, highlights, lastMove);

  // ─── Button handlers ───────────────────────────────────────
  btnHint.onclick = () => {
    if (solved) return;
    hintUsed = true;
    const sq = getMoveSquares(puzzle.solution[stepIndex], position);
    if (!sq) return;
    highlights = { [sq.from]: HL_HINT, [sq.to]: HL_HINT };
    renderPosition(position, highlights, lastMove);
    setStatus('playing', `💡 Best move: ${esc(puzzle.solution[stepIndex])}`);
    btnHint.disabled = true;
    btnHint.style.opacity = '0.4';
  };

  btnSkip.onclick = () => showSkip();

  btnFlip.onclick = () => {
    isFlipped = !isFlipped;
    rebuildBoard();
  };

  btnFS.onclick = () => {
    if (!document.fullscreenElement) {
      root.requestFullscreen?.().catch(() => {});
      btnFS.textContent = '✕';
    } else {
      document.exitFullscreen?.();
      btnFS.textContent = '⛶';
    }
  };
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) btnFS.textContent = '⛶';
  }, { once: false });

  // ─── Board click ───────────────────────────────────────────
  function onSquareClick(sq) {
    if (solved) return;
    const coord = sqToCoord(sq);

    if (selected) {
      const fromSq = coordToSq(selected.file, selected.rank);
      if (sq === fromSq) {
        selected = null; highlights = {};
        renderPosition(position, highlights, lastMove);
        return;
      }
      doMove(selected, coord);
    } else {
      const movable = getMovablePieces(position);
      if (movable.includes(sq)) {
        selected = coord;
        highlights = { [sq]: HL_SELECT };
        renderPosition(position, highlights, lastMove);
      }
    }
  }

  // ─── Move logic ────────────────────────────────────────────
  function doMove(fromCoord, toCoord) {
    selected = null;
    const san = puzzle.solution[stepIndex];
    const correct = checkUserMove(fromCoord, toCoord, san, position);

    if (correct) {
      const from = coordToSq(fromCoord.file, fromCoord.rank);
      const to   = coordToSq(toCoord.file,   toCoord.rank);
      lastMove = { from, to };
      position = applyMoveSan(san, position);
      stepIndex++;
      highlights = {};
      renderPosition(position, highlights, lastMove);

      if (stepIndex >= puzzle.solution.length) {
        onSolved();
      } else {
        setStatus('playing', '✓ Correct! Opponent is thinking…');
        btnHint.disabled = true;
        setTimeout(playOpponent, 750);
      }
    } else {
      const from = coordToSq(fromCoord.file, fromCoord.rank);
      const to   = coordToSq(toCoord.file,   toCoord.rank);
      highlights = { [from]: HL_WRONG, [to]: HL_WRONG };
      renderPosition(position, highlights, lastMove);
      setStatus('wrong');
      setTimeout(() => {
        if (!solved) {
          highlights = {};
          renderPosition(position, highlights, lastMove);
          setStatus('playing');
        }
      }, 1400);
    }
  }

  function playOpponent() {
    if (stepIndex >= puzzle.solution.length) return;
    const san = puzzle.solution[stepIndex];
    const sq = getMoveSquares(san, position);
    if (sq) lastMove = sq;
    position = applyMoveSan(san, position);
    stepIndex++;
    highlights = {};
    renderPosition(position, highlights, lastMove);
    if (stepIndex >= puzzle.solution.length) {
      onSolved();
    } else {
      btnHint.disabled = false;
      btnHint.style.opacity = '1';
      setStatus('playing');
    }
  }

  function onSolved() {
    solved = true;
    completePuzzle(puzzle.id, hintUsed, Date.now() - startTime);
    setStatus('correct');
    toast('Puzzle solved! 🎉');
    btnHint.style.display = 'none';
    btnSkip.style.display = 'none';
    showAnalysis();
  }

  // ─── Status banner ─────────────────────────────────────────
  function setStatus(s, msg) {
    if (s === 'correct') {
      banner.style.cssText += ';background:rgba(50,205,50,0.15);color:#50fa7b;';
      banner.textContent = '✅ Excellent! Puzzle solved!';
    } else if (s === 'wrong') {
      banner.style.cssText += ';background:rgba(220,50,50,0.15);color:#ff6b6b;';
      banner.textContent = '❌ Not the best — try again!';
    } else {
      banner.style.cssText += ';background:rgba(255,255,255,0.04);color:#f4c430;';
      banner.textContent = msg || (position.turn === 'w' ? '🎯 White to move' : '🎯 Black to move');
    }
  }

  // ─── Analysis panel ────────────────────────────────────────
  function showAnalysis() {
    let html = `<div style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.1)">
      <div style="font-weight:700;font-size:13px;color:#f4c430;margin-bottom:10px">
        📖 Step-by-step
      </div>`;
    puzzle.analysis.forEach(s => {
      html += `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
        <span style="background:#667eea;color:#fff;padding:2px 7px;border-radius:4px;
                     font-size:11px;font-weight:700;flex-shrink:0">${s.step}</span>
        <div>
          <div style="font-weight:600;font-size:13px">${esc(s.move)}</div>
          <div style="font-size:11px;color:#aaa">${esc(s.text_en)}</div>
        </div>
      </div>`;
    });
    html += `<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button onclick="location.hash='#/'"
        style="padding:8px 16px;background:rgba(255,255,255,0.1);color:#fff;
               border:1px solid rgba(255,255,255,0.15);border-radius:6px;cursor:pointer;font-size:13px">
        🏠 Home
      </button>
      <button id="btnNextPuzzle"
        style="padding:8px 16px;background:#667eea;color:#fff;
               border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
        Next Puzzle →
      </button>
    </div></div>`;
    analysisEl.innerHTML = html;
    analysisEl.style.maxHeight = '600px';
    analysisEl.style.padding = '0 16px';
    document.getElementById('btnNextPuzzle')?.addEventListener('click', () => {
      toast('Loading next puzzle…');
      setTimeout(() => location.hash = '#/', 500);
    });
  }

  // ─── Skip dialog ───────────────────────────────────────────
  function showSkip() {
    const ov = mk('div', `
      position:fixed;inset:0;background:rgba(0,0,0,0.75);
      display:flex;align-items:center;justify-content:center;
      z-index:9999;padding:20px;
    `);
    ov.innerHTML = `
      <div style="background:#1e1e2e;border:1px solid rgba(255,255,255,0.15);
                  border-radius:12px;padding:24px;max-width:300px;width:100%;text-align:center">
        <div style="font-size:36px;margin-bottom:10px">⏭️</div>
        <h3 style="margin:0 0 8px;font-size:15px">Skip this puzzle?</h3>
        <p style="color:#aaa;font-size:12px;margin:0 0 20px;line-height:1.5">
          Puzzle saved to <b style="color:#fff">Later</b> list.<br>
          You can revisit anytime.
        </p>
        <div style="display:flex;gap:8px">
          <button id="sc" style="flex:1;padding:9px;background:rgba(255,255,255,0.1);
            color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:6px;cursor:pointer">
            Cancel
          </button>
          <button id="sx" style="flex:1;padding:9px;background:#f39c12;
            color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">
            Skip & Save
          </button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#sc').onclick = () => ov.remove();
    ov.querySelector('#sx').onclick = () => {
      ov.remove();
      savePuzzleSkip(puzzle.id);
      toast('Saved for later ⏭️');
      setTimeout(() => location.hash = '#/', 600);
    };
  }

  // ─── Board builder ─────────────────────────────────────────
  function buildBoard() {
    const avail = Math.min(
      window.innerWidth  - 32,
      window.innerHeight - 280,
      480
    );
    const cellSz  = Math.max(32, Math.floor(avail / 8));
    const boardSz = cellSz * 8;

    const grid = mk('div', `
      display:grid;
      grid-template-columns:repeat(8,${cellSz}px);
      grid-template-rows:repeat(8,${cellSz}px);
      border:2px solid rgba(255,255,255,0.2);
      border-radius:4px;
      overflow:hidden;
      cursor:pointer;
      flex-shrink:0;
    `);

    for (let ri = 0; ri < 8; ri++) {
      for (let fi = 0; fi < 8; fi++) {
        const displayRank = isFlipped ? 7 - ri : ri;
        const displayFile = isFlipped ? 7 - fi : fi;
        const sq = coordToSq(displayFile, displayRank);
        const isLight = (displayFile + displayRank) % 2 === 0;
        const cell = mk('div', `
          width:${cellSz}px;height:${cellSz}px;
          display:flex;align-items:center;justify-content:center;
          font-size:${Math.floor(cellSz * 0.72)}px;
          background:${isLight ? LIGHT : DARK};
          user-select:none;cursor:pointer;position:relative;
        `);
        cell.dataset.sq = sq;

        // Rank label (left edge)
        if (fi === 0) {
          const lbl = mk('span', `
            position:absolute;top:2px;left:3px;
            font-size:${Math.floor(cellSz*0.22)}px;font-weight:700;
            color:${isLight ? DARK : LIGHT};pointer-events:none;z-index:3;line-height:1;
          `);
          lbl.textContent = 8 - displayRank;
          cell.appendChild(lbl);
        }
        // File label (bottom edge)
        if (ri === 7) {
          const lbl = mk('span', `
            position:absolute;bottom:2px;right:3px;
            font-size:${Math.floor(cellSz*0.22)}px;font-weight:700;
            color:${isLight ? DARK : LIGHT};pointer-events:none;z-index:3;line-height:1;
          `);
          lbl.textContent = String.fromCharCode(97 + displayFile);
          cell.appendChild(lbl);
        }

        cell.addEventListener('click', () => onSquareClick(cell.dataset.sq));
        grid.appendChild(cell);
      }
    }

    function renderPosition(pos, hls, last) {
      grid.querySelectorAll('[data-sq]').forEach(cell => {
        const sq = cell.dataset.sq;
        const { file, rank } = sqToCoord(sq);
        const isLight = (file + rank) % 2 === 0;
        const piece = pos.board[rank][file];

        // Clear old overlays (keep labels)
        cell.querySelectorAll('.hl-layer').forEach(e => e.remove());

        // Piece text
        const existing = cell.querySelector('.piece-text');
        if (existing) existing.remove();
        if (piece) {
          const pt = mk('span', `
            position:absolute;z-index:2;
            font-size:${Math.floor(cellSz * 0.72)}px;
            line-height:1;pointer-events:none;
            color:${piece === piece.toUpperCase() ? '#fff' : '#111'};
            text-shadow:${piece === piece.toUpperCase()
              ? '0 1px 3px rgba(0,0,0,0.9),0 0 6px rgba(0,0,0,0.5)'
              : '0 1px 2px rgba(255,255,255,0.6)'};
          `);
          pt.className = 'piece-text';
          pt.textContent = PIECE_SYMBOLS[piece] || '';
          cell.appendChild(pt);
        }

        cell.style.background = isLight ? LIGHT : DARK;

        // Last move highlight
        if (last && (sq === last.from || sq === last.to)) addHl(cell, HL_LAST);

        // Highlight overlay
        if (hls[sq]) addHl(cell, hls[sq]);
      });
    }

    return { boardEl: grid, renderPosition };
  }

  function rebuildBoard() {
    boardWrap.innerHTML = '';
    const built = buildBoard();
    boardWrap.appendChild(built.boardEl);
    built.renderPosition(position, highlights, lastMove);
    // Re-assign renderPosition closure — trick: swap via outer scope
    Object.assign(renderPosition_ref, { fn: built.renderPosition });
  }

  // We need a stable reference for renderPosition across rebuilds
  const renderPosition_ref = { fn: null };
  // Initial assignment already done via destructuring above
  // Use wrapper:
  function renderPosition(pos, hls, last) {
    return renderPosition_ref.fn?.(pos, hls, last);
  }

  // Fix initial ref
  const { boardEl, renderPosition: rp } = (() => {
    // Already built, just re-expose
    return { boardEl: boardWrap.firstChild, renderPosition: null };
  })();
  // Patch: the buildBoard() already ran and returned, we need to wire renderPosition
  // Let's redo this cleanly:
  boardWrap.innerHTML = '';
  const builtInitial = buildBoard();
  boardWrap.appendChild(builtInitial.boardEl);
  renderPosition_ref.fn = builtInitial.renderPosition;
  builtInitial.renderPosition(position, highlights, lastMove);
  setStatus('playing');
}

// ─── DOM helpers ────────────────────────────────────────────
function mk(tag, css) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css.trim();
  return e;
}

function btn(label, bg, color) {
  const b = mk('button', `
    padding:8px 14px;background:${bg};color:${color};
    border:1px solid rgba(255,255,255,0.12);border-radius:8px;
    cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;
  `);
  b.textContent = label;
  b.onmouseover = () => b.style.opacity = '0.8';
  b.onmouseout  = () => b.style.opacity = '1';
  return b;
}

function addHl(cell, color) {
  const d = document.createElement('div');
  d.className = 'hl-layer';
  d.style.cssText = `
    position:absolute;inset:0;background:${color};
    pointer-events:none;z-index:1;
  `;
  cell.appendChild(d);
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
