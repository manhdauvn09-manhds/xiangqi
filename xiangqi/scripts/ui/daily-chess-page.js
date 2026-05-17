/**
 * Daily Chess Puzzle — Interactive board
 * States: playing → correct/wrong → solved
 */
import { getDailyChessPuzzle, getLevel, getStreak, completePuzzle, skipPuzzle as savePuzzleSkip } from '../puzzles/chess-bank.js';
import { parseFen, PIECE_SYMBOLS, sqToCoord, coordToSq, applyMoveSan, checkUserMove, getMoveSquares, getMovablePieces } from '../chess/chess-mini.js';
import { toast } from './toast.js';

const LIGHT = '#f0d9b5', DARK = '#b58863';
const HL = {
  select:  'rgba(20,85,255,0.45)',
  hint:    'rgba(255,210,0,0.65)',
  correct: 'rgba(50,205,50,0.55)',
  wrong:   'rgba(220,50,50,0.55)',
  last:    'rgba(155,199,0,0.4)',
};

// Tier system (7 tiers across 100 levels)
const TIERS = [
  { name: 'Tân thủ', range: [1, 15], color: '#6c757d', emoji: '🎓' },
  { name: 'Học viên', range: [16, 30], color: '#0d6efd', emoji: '📚' },
  { name: 'Chiến binh', range: [31, 50], color: '#198754', emoji: '⚔️' },
  { name: 'Chuyên gia', range: [51, 70], color: '#ffc107', emoji: '🎯' },
  { name: 'Cao thủ', range: [71, 85], color: '#fd7e14', emoji: '🔥' },
  { name: 'Kiện tướng', range: [86, 95], color: '#dc3545', emoji: '👑' },
  { name: 'Đại kiện tướng', range: [96, 100], color: '#6f42c1', emoji: '⭐' },
];

function getTierByLevel(level) {
  return TIERS.find(t => level >= t.range[0] && level <= t.range[1]) || TIERS[0];
}

export function renderDailyChessPage(root) {
  const puzzle = getDailyChessPuzzle(new Date());
  if (!puzzle) {
    root.innerHTML = `<div style="padding:40px;text-align:center;color:#fff"><h2>No puzzle available</h2></div>`;
    return;
  }

  const startTime = Date.now();
  let pos;
  try {
    pos = parseFen(puzzle.fen);
  } catch (err) {
    console.error('Failed to parse puzzle FEN:', {
      puzzleId: puzzle.id,
      fen: puzzle.fen,
      error: err.message,
      errorStack: err.stack
    });
    root.innerHTML = `<div style="padding:40px;text-align:center;color:#fff">
      <h2>Error loading puzzle</h2>
      <p>${err.message}</p>
      <p style="color:#aaa;font-size:12px;margin-top:20px">Puzzle: ${puzzle.id}<br>FEN: ${puzzle.fen}</p>
    </div>`;
    return;
  }
  let step       = 0;
  let selected   = null;
  let hintUsed   = false;
  let highlights = {};
  let lastMove   = null;
  let isFlipped  = false;
  let solved     = false;
  let moveLog    = [];   // { san, side }
  let renderFn   = null; // set by rebuildBoard()

  // ── Root ──────────────────────────────────────────────────
  root.innerHTML = '';
  root.style.cssText = `
    background:#1a1a2e;min-height:100vh;
    display:flex;flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;
  `;

  // ── Header ─────────────────────────────────────────────────
  const level = getLevel();
  const tier = getTierByLevel(level);
  const header = $(`
    display:flex;justify-content:space-between;align-items:center;
    padding:10px 16px;background:rgba(255,255,255,0.05);
    border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;
  `);
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <a href="#/" style="color:#aaa;font-size:22px;text-decoration:none;line-height:1">←</a>
      <div>
        <div style="font-weight:700;font-size:14px">♟️ Chess Daily</div>
        <div style="font-size:11px;color:#aaa">${x(puzzle.opening)} · ${x(puzzle.theme)}</div>
      </div>
    </div>
    <div style="text-align:right;font-size:12px;color:#aaa;display:flex;gap:8px;align-items:center">
      <div>
        <div>🔥 <b style="color:#fff">${getStreak()}</b> day streak</div>
        <div style="color:#fff;font-weight:700">${tier.emoji} Lv ${level} · ${tier.name}</div>
      </div>
      <button id="btnTutorial" style="padding:4px 8px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;cursor:pointer;font-size:14px;line-height:1">?</button>
    </div>
  `;

  // ── Level Progress Bar ────────────────────────────────────
  const progressBar = $(`
    padding:12px 16px;background:rgba(255,255,255,0.02);flex-shrink:0;
  `);
  const progressWithinTier = level - tier.range[0] + 1;
  const tierSize = tier.range[1] - tier.range[0] + 1;
  const tierProgress = Math.round((progressWithinTier / tierSize) * 100);
  progressBar.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:12px">
      <div>
        <span style="color:#aaa">Level ${level}/100</span>
        <span style="color:#666;margin:0 6px">·</span>
        <span style="color:${tier.color};font-weight:700">${tier.emoji} ${tier.name}</span>
      </div>
      <span style="color:#999">${progressWithinTier}/${tierSize}</span>
    </div>
    <div style="
      width:100%;height:8px;background:rgba(255,255,255,0.1);
      border-radius:4px;overflow:hidden;
    ">
      <div style="
        width:${tierProgress}%;height:100%;background:${tier.color};
        transition:width 0.3s ease;
      "></div>
    </div>
  `;

  // ── Banner ─────────────────────────────────────────────────
  const banner = $(`
    padding:8px 16px;font-size:13px;font-weight:600;text-align:center;
    flex-shrink:0;min-height:36px;display:flex;align-items:center;justify-content:center;
  `);

  // ── Puzzle info ────────────────────────────────────────────
  const infoBar = $('padding:6px 16px;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;');
  infoBar.innerHTML = `
    <span style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;font-size:12px">⭐ ${puzzle.rating}</span>
    <span style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;font-size:12px">${x(puzzle.title)}</span>
  `;

  // ── Board area ─────────────────────────────────────────────
  const boardWrap = $('flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;min-height:0;gap:6px;');

  // ── Move history ───────────────────────────────────────────
  const histEl = $(`
    width:100%;max-width:480px;
    background:rgba(255,255,255,0.05);border-radius:8px;
    padding:6px 10px;font-size:12px;font-family:ui-monospace,monospace;
    display:flex;flex-wrap:wrap;gap:4px;align-items:center;
    min-height:28px;flex-shrink:0;
  `);
  histEl.innerHTML = '<span style="color:#666;font-size:11px">— no moves yet —</span>';

  // ── Analysis ───────────────────────────────────────────────
  const analysisEl = $('padding:0 16px;max-height:0;overflow:hidden;transition:max-height 0.4s;flex-shrink:0;');

  // ── Action buttons ─────────────────────────────────────────
  const actBar = $(`
    display:flex;justify-content:center;gap:8px;
    padding:10px 16px 14px;flex-shrink:0;
    border-top:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;
  `);
  const btnHint = btn('💡 Hint',  '#f4c430','#000');
  const btnSkip = btn('⏭️ Skip',  'rgba(255,255,255,0.1)','#fff');
  const btnFlip = btn('🔁 Flip',  'rgba(255,255,255,0.08)','#fff');
  const btnFS   = btn('⛶',        'rgba(255,255,255,0.08)','#fff');
  actBar.append(btnHint, btnSkip, btnFlip, btnFS);

  root.append(header, progressBar, banner, infoBar, boardWrap, analysisEl, actBar);

  // ── Tutorial Modal ───────────────────────────────────────
  function showTutorial() {
    const ov = $(`
      position:fixed;inset:0;background:rgba(0,0,0,0.85);
      display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;
    `);
    const tutorialKey = 'chess-daily-tutorial-seen';

    ov.innerHTML = `
      <div style="background:#1e1e2e;border:1px solid rgba(255,255,255,0.15);
                  border-radius:12px;padding:28px;max-width:500px;width:100%;
                  max-height:85vh;overflow-y:auto;font-size:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h2 style="margin:0;font-size:20px;color:#f4c430">🎓 Chess Daily Guide</h2>
          <button id="closeTut" style="background:none;border:none;color:#999;cursor:pointer;font-size:20px">✕</button>
        </div>

        <div style="color:#ddd;line-height:1.7">
          <h3 style="color:#fff;margin:16px 0 8px;font-size:15px">🎯 How to Play</h3>
          <ul style="padding-left:20px;margin:8px 0">
            <li>Your task is to find the <strong>best move</strong> in a chess position</li>
            <li>Click a piece to select it, then click where to move it</li>
            <li>Follow the solution step by step (both white and black moves)</li>
            <li>Solve the puzzle to unlock the next level</li>
          </ul>

          <h3 style="color:#fff;margin:16px 0 8px;font-size:15px">📊 100 Levels & Tiers</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0;font-size:12px">
            ${TIERS.map(t => `
              <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:6px;border-left:3px solid ${t.color}">
                <div style="font-weight:700;color:${t.color}">${t.emoji} ${t.name}</div>
                <div style="color:#999;font-size:11px">Levels ${t.range[0]}–${t.range[1]}</div>
              </div>
            `).join('')}
          </div>
          <p style="color:#999;font-size:12px;margin:10px 0">
            Advance one level each day you solve the puzzle. Climb through all 7 tiers to become a 🌟 <strong>Đại kiện tướng</strong>!
          </p>

          <h3 style="color:#fff;margin:16px 0 8px;font-size:15px">🛠️ Controls</h3>
          <div style="display:grid;gap:8px;margin:10px 0;font-size:12px">
            <div style="display:flex;gap:10px">
              <span style="background:rgba(244,196,48,0.2);padding:2px 8px;border-radius:4px;color:#f4c430;font-weight:700;min-width:80px">💡 Hint</span>
              <span style="color:#aaa">Shows the best next move (one-time use per puzzle)</span>
            </div>
            <div style="display:flex;gap:10px">
              <span style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;color:#fff;font-weight:700;min-width:80px">⏭️ Skip</span>
              <span style="color:#aaa">Skip this puzzle and save it for later</span>
            </div>
            <div style="display:flex;gap:10px">
              <span style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;color:#fff;font-weight:700;min-width:80px">🔁 Flip</span>
              <span style="color:#aaa">Flip board to view from black's perspective</span>
            </div>
            <div style="display:flex;gap:10px">
              <span style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;color:#fff;font-weight:700;min-width:80px">⛶</span>
              <span style="color:#aaa">Enter fullscreen mode for distraction-free play</span>
            </div>
          </div>

          <h3 style="color:#fff;margin:16px 0 8px;font-size:15px">🔥 Daily Streak</h3>
          <p style="color:#aaa;font-size:12px;margin:8px 0">
            Solve the daily puzzle every day to build your streak! The more days in a row you solve it, the higher your streak counter. Keep it going! 🚀
          </p>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px">
          <button id="closeTut2" style="flex:1;padding:10px;background:rgba(255,255,255,0.1);color:#fff;
                 border:1px solid rgba(255,255,255,0.2);border-radius:6px;cursor:pointer;font-weight:600">Got it!</button>
        </div>
      </div>`;

    document.body.appendChild(ov);

    const closeFn = () => {
      ov.remove();
      localStorage.setItem(tutorialKey, 'true');
    };
    ov.querySelector('#closeTut').onclick = closeFn;
    ov.querySelector('#closeTut2').onclick = closeFn;
    ov.addEventListener('click', (e) => {
      if (e.target === ov) closeFn();
    });
  }

  // Show tutorial on first visit
  const tutorialKey = 'chess-daily-tutorial-seen';
  if (!localStorage.getItem(tutorialKey)) {
    setTimeout(() => showTutorial(), 300);
  }

  // ── Build board (called on init + flip + fullscreen) ──────────
  function rebuildBoard() {
    boardWrap.innerHTML = '';
    const isFS = !!document.fullscreenElement;
    const pct  = isFS ? 0.95 : 0.80;
    // Board is square: fit inside available width & height
    const uiH  = isFS ? 0 : 210; // header + banner + info + actions + history
    const availW = window.innerWidth  * pct;
    const availH = window.innerHeight * pct - uiH;
    const boardSz = Math.max(240, Math.floor(Math.min(availW, availH)));
    const cellSz  = Math.floor(boardSz / 8);

    const grid = document.createElement('div');
    grid.style.cssText = `
      display:grid;
      grid-template-columns:repeat(8,${cellSz}px);
      grid-template-rows:repeat(8,${cellSz}px);
      border:2px solid rgba(255,255,255,0.2);
      border-radius:4px;overflow:hidden;cursor:pointer;flex-shrink:0;
    `;

    for (let ri = 0; ri < 8; ri++) {
      for (let fi = 0; fi < 8; fi++) {
        const dRank = isFlipped ? 7 - ri : ri;
        const dFile = isFlipped ? 7 - fi : fi;
        const sq    = coordToSq(dFile, dRank);
        const light = (dFile + dRank) % 2 === 0;

        const cell  = document.createElement('div');
        cell.style.cssText = `
          width:${cellSz}px;height:${cellSz}px;
          display:flex;align-items:center;justify-content:center;
          background:${light ? LIGHT : DARK};
          position:relative;user-select:none;cursor:pointer;
        `;
        cell.dataset.sq = sq;

        if (fi === 0) {
          const lbl = Object.assign(document.createElement('span'), {
            textContent: 8 - dRank,
            style: {cssText: `
              position:absolute;top:2px;left:3px;
              font-size:${Math.floor(cellSz*.2)}px;font-weight:700;
              color:${light?DARK:LIGHT};pointer-events:none;z-index:3;
            `}
          });
          Object.assign(lbl.style, {
            position:'absolute',top:'2px',left:'3px',
            fontSize: Math.floor(cellSz*.2)+'px', fontWeight:'700',
            color: light?DARK:LIGHT, pointerEvents:'none',zIndex:'3',lineHeight:'1',
          });
          cell.appendChild(lbl);
        }
        if (ri === 7) {
          const lbl = document.createElement('span');
          Object.assign(lbl.style, {
            position:'absolute',bottom:'2px',right:'3px',
            fontSize: Math.floor(cellSz*.2)+'px', fontWeight:'700',
            color: light?DARK:LIGHT, pointerEvents:'none',zIndex:'3',lineHeight:'1',
          });
          lbl.textContent = String.fromCharCode(97 + dFile);
          cell.appendChild(lbl);
        }

        cell.addEventListener('click', () => onSquareClick(cell.dataset.sq));
        grid.appendChild(cell);
      }
    }

    boardWrap.appendChild(grid);
    boardWrap.appendChild(histEl);

    // Render function — paints pieces & highlights on the grid
    renderFn = (p, hls, last) => {
      grid.querySelectorAll('[data-sq]').forEach(cell => {
        const sq            = cell.dataset.sq;
        const { file, rank} = sqToCoord(sq);
        const piece         = p.board[rank][file];
        const light         = (file + rank) % 2 === 0;

        cell.style.background = light ? LIGHT : DARK;
        cell.querySelectorAll('.hl,.pc').forEach(e => e.remove());

        // Last move tint
        if (last && (sq === last.from || sq === last.to)) hl(cell, HL.last);
        // Highlights
        if (hls[sq]) hl(cell, hls[sq]);

        // Piece
        if (piece) {
          const pt = document.createElement('span');
          pt.className = 'pc';
          Object.assign(pt.style, {
            position:'absolute', zIndex:'2',
            fontSize: Math.floor(cellSz * .72) + 'px',
            lineHeight:'1', pointerEvents:'none',
            color: piece === piece.toUpperCase() ? '#fff' : '#111',
            textShadow: piece === piece.toUpperCase()
              ? '0 1px 3px rgba(0,0,0,.9),0 0 6px rgba(0,0,0,.5)'
              : '0 1px 2px rgba(255,255,255,.6)',
          });
          pt.textContent = PIECE_SYMBOLS[piece] || '';
          cell.appendChild(pt);
        }
      });
    };

    renderFn(pos, highlights, lastMove);
  }

  function hl(cell, color) {
    const d = document.createElement('div');
    d.className = 'hl';
    Object.assign(d.style, {
      position:'absolute',inset:'0',background:color,pointerEvents:'none',zIndex:'1',
    });
    cell.appendChild(d);
  }

  // ── Init ──────────────────────────────────────────────────
  rebuildBoard();
  setBanner('playing');

  // Resize: rebuild board when window size changes
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuildBoard, 150);
  });

  // ── Handlers ──────────────────────────────────────────────
  document.getElementById('btnTutorial')?.addEventListener('click', showTutorial);

  btnHint.onclick = () => {
    if (solved) return;
    hintUsed = true;
    const sq = getMoveSquares(puzzle.solution[step], pos);
    if (!sq) return;
    highlights = { [sq.from]: HL.hint, [sq.to]: HL.hint };
    renderFn(pos, highlights, lastMove);
    setBanner('playing', `💡 Best: ${x(puzzle.solution[step])}`);
    btnHint.disabled = true; btnHint.style.opacity = '.4';
  };

  btnSkip.onclick = showSkip;

  btnFlip.onclick = () => {
    isFlipped = !isFlipped;
    rebuildBoard();
    setBanner('playing');
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
    const isFS = !!document.fullscreenElement;
    btnFS.textContent = isFS ? '✕' : '⛶';
    // Rebuild board at new size
    rebuildBoard();
    setBanner('playing');
  });

  // ── Square click ──────────────────────────────────────────
  function onSquareClick(sq) {
    if (solved) return;
    const coord = sqToCoord(sq);
    if (selected) {
      const fromSq = coordToSq(selected.file, selected.rank);
      if (sq === fromSq) {
        selected = null; highlights = {};
        renderFn(pos, highlights, lastMove); return;
      }
      doMove(selected, coord);
    } else {
      if (getMovablePieces(pos).includes(sq)) {
        selected = coord;
        highlights = { [sq]: HL.select };
        renderFn(pos, highlights, lastMove);
      }
    }
  }

  // ── Move logic ────────────────────────────────────────────
  function doMove(fromC, toC) {
    selected = null;
    const san = puzzle.solution[step];
    if (checkUserMove(fromC, toC, san, pos)) {
      applyStep(san, true);
    } else {
      const f = coordToSq(fromC.file, fromC.rank);
      const t = coordToSq(toC.file,  toC.rank);
      highlights = { [f]: HL.wrong, [t]: HL.wrong };
      renderFn(pos, highlights, lastMove);
      setBanner('wrong');
      setTimeout(() => { if (!solved) { highlights={}; renderFn(pos,highlights,lastMove); setBanner('playing'); }}, 1400);
    }
  }

  function applyStep(san, isUser) {
    const sqInfo = getMoveSquares(san, pos);
    if (sqInfo) lastMove = sqInfo;
    const side = pos.turn;
    pos = applyMoveSan(san, pos);
    step++;
    highlights = {};

    // Add to move log
    moveLog.push({ san, side });
    updateMoveLog();

    renderFn(pos, highlights, lastMove);

    if (step >= puzzle.solution.length) {
      onSolved(); return;
    }
    if (isUser) {
      setBanner('playing', '✓ Correct! Opponent thinking…');
      btnHint.disabled = true;
      setTimeout(() => applyStep(puzzle.solution[step], false), 700);
    } else {
      btnHint.disabled = false; btnHint.style.opacity = '1';
      setBanner('playing');
    }
  }

  function onSolved() {
    solved = true;
    completePuzzle(puzzle.id, hintUsed, Date.now() - startTime);
    setBanner('correct');
    toast('Puzzle solved! 🎉');
    btnHint.style.display = 'none';
    btnSkip.style.display = 'none';
    showAnalysis();
  }

  // ── Move log display ──────────────────────────────────────
  function updateMoveLog() {
    if (!moveLog.length) return;
    let html = '';
    let moveNum = 1;
    for (let i = 0; i < moveLog.length; i += 2) {
      const w = moveLog[i];
      const b = moveLog[i + 1];
      html += `<span style="color:#666;font-size:10px;margin-right:2px">${moveNum}.</span>`;
      html += `<span style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:3px;
                            color:${w.side==='w'?'#fff':'#80f'}">${x(w.san)}</span> `;
      if (b) html += `<span style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:3px;
                                   color:${b.side==='w'?'#fff':'#80f'}">${x(b.san)}</span> `;
      moveNum++;
    }
    histEl.innerHTML = html;
    histEl.scrollLeft = histEl.scrollWidth;
  }

  // ── Banner ────────────────────────────────────────────────
  function setBanner(state, msg) {
    const styles = {
      correct: ['rgba(50,205,50,0.15)','#50fa7b'],
      wrong:   ['rgba(220,50,50,0.15)','#ff6b6b'],
      playing: ['rgba(255,255,255,0.04)','#f4c430'],
    };
    const [bg, color] = styles[state] || styles.playing;
    banner.style.background = bg;
    banner.style.color = color;
    banner.textContent = msg || (state === 'correct' ? '✅ Excellent! Puzzle solved!' :
      state === 'wrong' ? '❌ Not the best — try again!' :
      pos.turn === 'w' ? '🎯 White to move' : '🎯 Black to move');
  }

  // ── Analysis ──────────────────────────────────────────────
  function showAnalysis() {
    let html = `<div style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.1)">
      <div style="font-weight:700;font-size:13px;color:#f4c430;margin-bottom:10px">📖 Analysis</div>`;
    puzzle.analysis.forEach(s => {
      html += `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
        <span style="background:#667eea;color:#fff;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;flex-shrink:0">${s.step}</span>
        <div>
          <div style="font-weight:600;font-size:13px">${x(s.move)}</div>
          <div style="font-size:11px;color:#aaa">${x(s.text_en)}</div>
        </div>
      </div>`;
    });
    html += `<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button onclick="location.hash='#/'"
        style="padding:8px 16px;background:rgba(255,255,255,0.1);color:#fff;
               border:1px solid rgba(255,255,255,0.15);border-radius:6px;cursor:pointer;font-size:13px">
        🏠 Home
      </button>
      <button id="btnNext"
        style="padding:8px 16px;background:#667eea;color:#fff;
               border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
        Next Puzzle →
      </button>
    </div></div>`;
    analysisEl.innerHTML = html;
    analysisEl.style.maxHeight = '600px';
    analysisEl.style.padding = '0 16px';
    document.getElementById('btnNext')?.addEventListener('click', () => {
      toast('Loading next puzzle…');
      setTimeout(() => location.hash = '#/', 500);
    });
  }

  // ── Skip dialog ───────────────────────────────────────────
  function showSkip() {
    const ov = $(`
      position:fixed;inset:0;background:rgba(0,0,0,0.75);
      display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;
    `);
    ov.innerHTML = `
      <div style="background:#1e1e2e;border:1px solid rgba(255,255,255,0.15);
                  border-radius:12px;padding:24px;max-width:300px;width:100%;text-align:center">
        <div style="font-size:36px;margin-bottom:10px">⏭️</div>
        <h3 style="margin:0 0 8px;font-size:15px">Skip this puzzle?</h3>
        <p style="color:#aaa;font-size:12px;margin:0 0 20px;line-height:1.5">
          Saved to <b style="color:#fff">Later</b> list. Revisit anytime.
        </p>
        <div style="display:flex;gap:8px">
          <button id="sc" style="flex:1;padding:9px;background:rgba(255,255,255,0.1);
            color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:6px;cursor:pointer">Cancel</button>
          <button id="sx" style="flex:1;padding:9px;background:#f39c12;
            color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Skip & Save</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#sc').onclick = () => ov.remove();
    ov.querySelector('#sx').onclick = () => {
      ov.remove(); savePuzzleSkip(puzzle.id);
      toast('Saved for later ⏭️');
      setTimeout(() => location.hash = '#/', 600);
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────
function $(css) {
  const e = document.createElement('div');
  if (css) e.style.cssText = css.trim();
  return e;
}
function btn(label, bg, color) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = `padding:8px 14px;background:${bg};color:${color};border:1px solid rgba(255,255,255,0.12);border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;`;
  b.onmouseover = () => b.style.opacity = '.8';
  b.onmouseout  = () => b.style.opacity = '1';
  return b;
}
function x(s) { return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
