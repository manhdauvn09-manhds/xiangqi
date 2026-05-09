// Cờ Tướng Vương — Daily Challenge page
import { t } from '../i18n/i18n.js';
import { getDailyPuzzle, dateKey } from '../puzzles/bank.js';
import { fromFEN, applyMove, undoMove, pieceAt } from '../core/board.js';
import { isCheck, isCheckmate, isFacingGenerals, generateLegalMoves } from '../core/rules.js';
import { movesForPiece } from '../core/moves.js';
import { OPP } from '../core/constants.js';
import { createBoardRenderer } from './board-renderer.js';
import { toast, confirm } from './toast.js';
import { SoundFX } from '../sound/sound.js';

const STORAGE = 'xq_daily_streak';

function getStreak() {
  try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); }
  catch { return {}; }
}
function setStreak(o) { localStorage.setItem(STORAGE, JSON.stringify(o)); }

export function renderDailyPage(root) {
  const puzzle = getDailyPuzzle();
  const board = fromFEN(puzzle.fen);
  const streak = getStreak();
  const todaySolved = streak[puzzle.dateKey] === 'solved';

  let selected = null;
  let legalForSelected = [];
  let solved = todaySolved;
  let attempts = 0;
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
        </div>
        <div class="hint-box hidden" id="hintBox"></div>
        <div class="muted small" style="text-align:center; margin-top:8px;">
          ${esc(t('daily.attempts'))}: <span id="attemptCount">0</span>
        </div>
      </div>
    </div>
  `;

  const renderer = createBoardRenderer(
    root.querySelector('#dailyBoard'),
    (f, r) => onSquareClick(f, r),
    {}
  );
  renderer.setBoard(board);

  function onSquareClick(file, rank) {
    if (solved) return;
    const piece = pieceAt(board, file, rank);
    if (selected) {
      // click cùng phe → đổi quân
      if (piece && piece.side === board.side) {
        select(file, rank);
        return;
      }
      const move = legalForSelected.find(m => m.to.file === file && m.to.rank === rank);
      if (move) {
        applyAndCheck(move);
        return;
      }
      select(null);
      return;
    }
    if (piece && piece.side === board.side) select(file, rank);
  }

  function select(f, r) {
    if (f == null) {
      selected = null;
      legalForSelected = [];
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

  function applyAndCheck(move) {
    applyMove(board, move);
    SoundFX.move();
    selected = null;
    legalForSelected = [];
    renderer.setBoard(board);
    renderer.setSelected(null, []);
    renderer.setLastMove(move);
    attempts++;
    const ac = root.querySelector('#attemptCount');
    if (ac) ac.textContent = attempts;

    // Check kết quả
    const oppSide = board.side; // bên đối phương đến lượt
    if (isCheckmate(board, oppSide)) {
      onSolved();
      return;
    }
    // Đối phương vẫn còn nước → ta đi sai
    setTimeout(() => {
      undoMove(board);
      renderer.setBoard(board);
      renderer.setLastMove(null);
      SoundFX.illegal();
      toast(t('daily.try_again'), { type: 'warn' });
    }, 600);
  }

  function onSolved() {
    solved = true;
    SoundFX.win();
    const elapsed = Math.round((Date.now() - startTs) / 1000);
    const st = getStreak();
    st[puzzle.dateKey] = 'solved';
    setStreak(st);
    root.querySelector('#dailyStatus').innerHTML = `✅ <strong>${esc(t('daily.solved'))}</strong> · ${attempts} ${esc(t('daily.tries'))} · ${elapsed}s`;
    setTimeout(async () => {
      await confirm({
        title: '🎉 ' + t('daily.solved'),
        body: `<p>${esc(t('daily.solved.body', { n: attempts, s: elapsed }))}</p>`,
        okText: t('btn.close'),
        cancelText: t('btn.back_home'),
      });
    }, 400);
  }

  // Hint
  root.querySelector('#btnHint')?.addEventListener('click', () => {
    if (solved) return;
    const box = root.querySelector('#hintBox');
    box.classList.remove('hidden');
    box.innerHTML = `💡 ${esc(puzzle.hint.vi)}`;
  });

  root.querySelector('#btnReset')?.addEventListener('click', () => {
    if (solved) return;
    location.reload();
  });
}

function countStreak(streak) {
  // Đếm chuỗi ngày liên tiếp tới hôm nay đã giải
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
