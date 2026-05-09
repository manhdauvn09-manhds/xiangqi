// Cờ Tướng Vương — Replay viewer
import { t } from '../i18n/i18n.js';
import { listGames } from '../storage/local.js';
import { createInitialBoard, applyMove, undoMove, fromFEN } from '../core/board.js';
import { iccsToMove } from '../core/notation.js';
import { createBoardRenderer } from './board-renderer.js';
import { toast } from './toast.js';

export function renderReplayPage(root, gameId) {
  const all = listGames(200);
  const game = all.find(g => g.id === gameId);
  if (!game) {
    root.innerHTML = `
      <h1 class="page-h1">▶ ${esc(t('nav.replay'))}</h1>
      <div class="empty-state">
        <div class="big-ico">❓</div>
        <p>${esc(t('replay.not_found'))}</p>
        <a class="btn btn-primary" href="#/history">${esc(t('btn.back_history'))}</a>
      </div>`;
    return;
  }

  // Setup
  const board = createInitialBoard(game.variant === 'blind' ? 'blind' : 'standard');
  const moves = (game.moves || []).map(m => {
    const parsed = iccsToMove(m.iccs);
    return parsed ? { ...parsed, san: m.san, iccs: m.iccs, side: m.side } : null;
  }).filter(Boolean);

  let cursor = 0;     // số nước đã apply
  let playing = false;
  let playTimer = null;

  root.innerHTML = `
    <h1 class="page-h1">▶ ${esc(t('nav.replay'))}</h1>
    <div class="replay-meta">
      <span>${esc(new Date(game.playedAt).toLocaleString())}</span>
      <span class="sep">·</span>
      <span>🤖 Bot Lv ${game.botLevel ?? '—'}</span>
      <span class="sep">·</span>
      <span>${game.variant === 'blind' ? '🎴 ' + esc(t('variant.blind')) : '♟ ' + esc(t('variant.standard'))}</span>
      <span class="sep">·</span>
      <span><strong>${esc(game.result || '—')}</strong> ${esc(game.reason || '')}</span>
    </div>

    <div class="replay-layout">
      <div class="xq-board-stage">
        <div class="xq-board-wrap" id="replayBoard"></div>
      </div>

      <div class="replay-side">
        <div class="replay-controls">
          <button class="btn" data-act="first" title="${esc(t('replay.first'))}">⏮</button>
          <button class="btn" data-act="prev"  title="${esc(t('replay.prev'))}">⏪</button>
          <button class="btn btn-primary" data-act="play"  title="${esc(t('replay.play'))}">▶</button>
          <button class="btn" data-act="next"  title="${esc(t('replay.next'))}">⏩</button>
          <button class="btn" data-act="last"  title="${esc(t('replay.last'))}">⏭</button>
        </div>
        <div class="replay-progress">
          <input type="range" min="0" max="${moves.length}" value="0" class="range" id="seekBar">
          <div class="muted small" id="cursorTxt">0 / ${moves.length}</div>
        </div>
        <div class="xq-moves" id="movesPanel">
          <div class="head">${esc(t('log.title'))}</div>
          <div id="movesBody"></div>
        </div>
      </div>
    </div>
  `;

  const renderer = createBoardRenderer(root.querySelector('#replayBoard'), () => {}, {});
  renderer.setBoard(board);

  function renderMoves() {
    const el = root.querySelector('#movesBody');
    if (!el) return;
    if (moves.length === 0) { el.innerHTML = `<div class="empty">${esc(t('log.empty'))}</div>`; return; }
    const rows = [];
    for (let i = 0; i < moves.length; i += 2) {
      const r = moves[i], b = moves[i+1];
      const idx = i / 2 + 1;
      const rTxt = r ? r.san : '';
      const bTxt = b ? b.san : '';
      const rCls = (cursor === i + 1) ? 'current' : '';
      const bCls = (cursor === i + 2) ? 'current' : '';
      rows.push(`<tr><td class="idx">${idx}.</td><td class="r ${rCls}" data-jump="${i+1}">${esc(rTxt)}</td><td class="b ${bCls}" data-jump="${i+2}">${esc(bTxt)}</td></tr>`);
    }
    el.innerHTML = `<table>${rows.join('')}</table>`;
    el.querySelectorAll('[data-jump]').forEach(td => {
      td.addEventListener('click', () => seekTo(parseInt(td.dataset.jump, 10)));
    });
    el.scrollTop = el.scrollHeight;
  }

  function seekTo(target) {
    target = Math.max(0, Math.min(moves.length, target));
    while (cursor < target) {
      const m = moves[cursor];
      if (!m) break;
      applyMove(board, m);
      cursor++;
    }
    while (cursor > target) {
      undoMove(board);
      cursor--;
    }
    renderer.setBoard(board);
    if (cursor > 0) renderer.setLastMove(moves[cursor - 1]);
    else renderer.setLastMove(null);
    root.querySelector('#seekBar').value = cursor;
    root.querySelector('#cursorTxt').textContent = `${cursor} / ${moves.length}`;
    renderMoves();
  }

  function togglePlay() {
    playing = !playing;
    const btn = root.querySelector('[data-act="play"]');
    btn.textContent = playing ? '⏸' : '▶';
    if (playing) {
      playTimer = setInterval(() => {
        if (cursor >= moves.length) { togglePlay(); return; }
        seekTo(cursor + 1);
      }, 800);
    } else {
      clearInterval(playTimer);
    }
  }

  root.querySelectorAll('[data-act]').forEach(b => {
    b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'first') seekTo(0);
      else if (a === 'prev') seekTo(cursor - 1);
      else if (a === 'next') seekTo(cursor + 1);
      else if (a === 'last') seekTo(moves.length);
      else if (a === 'play') togglePlay();
    });
  });

  root.querySelector('#seekBar').addEventListener('input', e => {
    seekTo(parseInt(e.target.value, 10));
  });

  // Cleanup
  window.addEventListener('hashchange', () => {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
  }, { once: true });

  renderMoves();
  root.querySelector('#cursorTxt').textContent = `0 / ${moves.length}`;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
