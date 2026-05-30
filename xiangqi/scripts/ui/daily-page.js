// Cờ Tướng Vương — Daily Challenge page
// Cách chơi MỚI: người chơi được đi TỰ DO (mọi nước hợp lệ, KHÔNG bị undo).
// Máy phòng thủ tối ưu. Thắng (chiếu hết hoặc vây hãm) trong/đúng số nước → giải xong.
// Chỉ báo "chưa đạt" khi: thua, hoà, hoặc đi quá nhiều nước mà không thắng — vẫn cho chơi tiếp.
import { t } from '../i18n/i18n.js';
import { getDailyPuzzle, dateKey } from '../puzzles/bank.js';
import { fromFEN, applyMove, undoMove, pieceAt } from '../core/board.js';
import { isCheck, isFacingGenerals, generateLegalMoves, detectGameResult } from '../core/rules.js';
import { movesForPiece } from '../core/moves.js';
import { OPP } from '../core/constants.js';
import { searchBestMove } from '../ai/search.js';
import { createBoardRenderer } from './board-renderer.js';
import { toast, confirm } from './toast.js';
import { SoundFX } from '../sound/sound.js';

const STORAGE = 'xq_daily_streak';
const MAX_PLAYER_MOVES = 30;   // chặn vòng lặp vô hạn — quá số này coi như chưa giải được

function getStreak() {
  try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); }
  catch { return {}; }
}
function setStreak(o) { localStorage.setItem(STORAGE, JSON.stringify(o)); }

export function renderDailyPage(root) {
  const puzzle = getDailyPuzzle();
  const board = fromFEN(puzzle.fen);
  const solverSide = puzzle.solverSide || 'r';
  const streak = getStreak();
  const todaySolved = streak[puzzle.dateKey] === 'solved';

  let selected = null;
  let legalForSelected = [];
  let solved = todaySolved;
  let finished = todaySolved;   // true khi đã thắng (khoá bàn cờ)
  let busy = false;             // máy đang suy nghĩ
  let playerMoves = 0;
  let startTs = Date.now();

  root.innerHTML = `
    <div class="daily-head">
      <div>
        <h1 class="page-h1">🎯 ${esc(t('nav.daily'))}</h1>
        <p class="page-sub">${esc(puzzle.title.vi)} · ${esc(t('daily.mate_in'))} ${puzzle.mateIn}</p>
      </div>
      <div class="streak-badge">
        🔥 ${esc(t('daily.streak'))}: <strong>${countStreak(streak)}</strong>
      </div>
    </div>

    <div class="daily-layout">
      <div class="xq-board-stage">
        <div class="xq-board-wrap" id="dailyBoard"></div>
      </div>
      <div class="daily-side">
        <div class="daily-status" id="dailyStatus">
          ${solved ? '✅ ' + esc(t('daily.already_solved')) : esc(t('status.your_turn'))}
        </div>
        <div class="puzzle-info">
          <div class="muted small">${esc(t('daily.task'))}</div>
          <div class="puzzle-task">
            ${esc(t('daily.find_mate', { n: puzzle.mateIn }))}
          </div>
        </div>
        <div class="daily-actions">
          <button class="btn" id="btnHint">💡 ${esc(t('btn.hint'))}</button>
          <button class="btn" id="btnReset">↺ ${esc(t('btn.reset'))}</button>
          <button class="btn" id="btnSolution">📖 Xem giải</button>
        </div>
        <div class="hint-box hidden" id="hintBox"></div>
        <div class="muted small" style="text-align:center; margin-top:8px;">
          ${esc(t('daily.attempts'))}: <span id="attemptCount">0</span> / ${puzzle.mateIn}
        </div>
        <div id="solutionBox" style="display:none;margin-top:12px;background:rgba(255,255,255,0.05);border-radius:8px;padding:12px;border-left:3px solid #f4c430;"></div>
      </div>
    </div>
  `;

  const renderer = createBoardRenderer(
    root.querySelector('#dailyBoard'),
    (f, r) => onSquareClick(f, r),
    { flipped: solverSide === 'b' }
  );
  renderer.setBoard(board);

  function setStatus(html) {
    const el = root.querySelector('#dailyStatus');
    if (el) el.innerHTML = html;
  }

  function onSquareClick(file, rank) {
    if (finished || busy) return;
    if (board.side !== solverSide) return;   // chỉ cho đi khi tới lượt mình
    const piece = pieceAt(board, file, rank);
    if (selected) {
      if (piece && piece.side === board.side) { select(file, rank); return; }
      const move = legalForSelected.find(m => m.to.file === file && m.to.rank === rank);
      if (move) { playerMove(move); return; }
      select(null);
      return;
    }
    if (piece && piece.side === board.side) select(file, rank);
  }

  function select(f, r) {
    if (f == null) {
      selected = null; legalForSelected = [];
      renderer.setSelected(null, []);
      return;
    }
    selected = { file: f, rank: r };
    const pseudo = movesForPiece(board, f, r);
    legalForSelected = pseudo.filter(m => {
      applyMove(board, m);
      const movedSide = OPP[board.side];
      const ok = !isCheck(board, movedSide) && !isFacingGenerals(board);
      undoMove(board);
      return ok;
    });
    renderer.setSelected(selected, legalForSelected.map(m => m.to));
  }

  function playerMove(move) {
    applyMove(board, move);
    SoundFX.move();
    selected = null; legalForSelected = [];
    renderer.setBoard(board);
    renderer.setSelected(null, []);
    renderer.setLastMove(move);
    playerMoves++;
    const ac = root.querySelector('#attemptCount');
    if (ac) ac.textContent = playerMoves;

    const res = detectGameResult(board);
    if (res.ended) return finishGame(res);

    // tới lượt máy phòng thủ
    setStatus('🤖 ' + esc(t('status.thinking') || 'Máy đang suy nghĩ…'));
    busy = true;
    setTimeout(opponentMove, 350);
  }

  function opponentMove() {
    if (finished) { busy = false; return; }
    // máy đi nước phòng thủ tốt nhất (kéo dài/né chiếu hết)
    let mv = null;
    try {
      const r = searchBestMove(board, { maxDepth: 6, timeMs: 600, useTT: true });
      mv = r.move;
    } catch (_) { mv = null; }
    if (!mv) {
      const legal = generateLegalMoves(board, board.side);
      mv = legal[0] || null;
    }
    if (mv) {
      applyMove(board, mv);
      SoundFX.move();
      renderer.setBoard(board);
      renderer.setLastMove(mv);
      if (isCheck(board, board.side)) SoundFX.check?.();
    }
    busy = false;

    const res = detectGameResult(board);
    if (res.ended) return finishGame(res);

    if (playerMoves >= MAX_PLAYER_MOVES) return onNotSolved('too_many');

    if (playerMoves >= puzzle.mateIn) {
      setStatus(`⚠️ ${esc(t('status.your_turn'))} — đã quá ${puzzle.mateIn} nước, cố thắng hoặc ↺ thử lại`);
    } else {
      setStatus(esc(t('status.your_turn')));
    }
  }

  function finishGame(res) {
    finished = true; busy = false;
    if (res.winner === solverSide) return onSolved();
    // thua hoặc hoà
    return onNotSolved(res.reason === '60_move' ? 'draw' : 'lost');
  }

  function onSolved() {
    solved = true; finished = true;
    SoundFX.win();
    const elapsed = Math.round((Date.now() - startTs) / 1000);
    const st = getStreak();
    st[puzzle.dateKey] = 'solved';
    setStreak(st);
    const perfect = playerMoves <= puzzle.mateIn;
    setStatus(`✅ <strong>${esc(t('daily.solved'))}</strong> · ${playerMoves} ${esc(t('daily.tries'))} · ${elapsed}s${perfect ? ' · ⭐ tối ưu' : ''}`);
    showSolution(true);
    setTimeout(async () => {
      await confirm({
        title: '🎉 ' + t('daily.solved'),
        body: `<p>${esc(t('daily.solved.body', { n: playerMoves, s: elapsed }))}</p>`,
        okText: t('btn.close'),
        cancelText: t('btn.back_home'),
      });
    }, 800);
  }

  function onNotSolved(kind) {
    finished = true; busy = false;
    SoundFX.illegal();
    const msg = kind === 'lost' ? 'Bạn đã thua thế cờ này 😅'
              : kind === 'draw' ? 'Ván hoà — chưa thắng được'
              : 'Chưa thắng trong giới hạn nước đi';
    setStatus(`❌ <strong>${esc(msg)}</strong> — ↺ bấm Thử lại để chơi lại`);
    toast(msg + ' — bấm ↺ Thử lại', { type: 'warn' });
  }

  function showSolution(afterSolve = false) {
    const box = root.querySelector('#solutionBox');
    if (!box) return;
    if (box.style.display !== 'none') { box.style.display = 'none'; return; }

    const analysis = puzzle.analysis || [];
    let html = `<div style="font-weight:700;font-size:13px;color:#f4c430;margin-bottom:10px">
      ${afterSolve ? '🎉 Cách giải mẫu' : '📖 Cách giải (spoiler)'}
    </div>`;

    if (analysis.length) {
      analysis.forEach(a => {
        html += `<div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start">
          <span style="background:#667eea;color:#fff;padding:2px 7px;border-radius:4px;
                       font-size:11px;font-weight:700;flex-shrink:0;min-width:24px;text-align:center">${a.step}</span>
          <div>
            <div style="font-weight:600;font-size:13px">${esc(a.move)}</div>
            <div style="font-size:12px;color:#aaa;line-height:1.4">${esc(a.vi)}</div>
          </div>
        </div>`;
      });
    } else {
      (puzzle.solution || []).forEach((mv, i) => {
        html += `<div style="margin-bottom:6px;font-size:13px">
          <span style="color:#f4c430;font-weight:700">Nước ${i+1}:</span> <code>${esc(mv)}</code>
        </div>`;
      });
    }

    box.innerHTML = html;
    box.style.display = 'block';
  }

  // Hint
  root.querySelector('#btnHint')?.addEventListener('click', () => {
    if (finished) return;
    const box = root.querySelector('#hintBox');
    box.classList.remove('hidden');
    box.innerHTML = `💡 ${esc(puzzle.hint.vi)}`;
  });

  root.querySelector('#btnReset')?.addEventListener('click', () => {
    location.reload();
  });

  root.querySelector('#btnSolution')?.addEventListener('click', () => {
    showSolution(false);
  });
}

function countStreak(streak) {
  let count = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);
    if (streak[key] === 'solved') count++;
    else break;
  }
  return count;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
