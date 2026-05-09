// Cờ Tướng Vương — History page
import { t } from '../i18n/i18n.js';
import { listGames } from '../storage/local.js';
import { confirm } from './toast.js';
import { isAuthed, games as apiGames } from '../net/api.js';

export async function renderHistoryPage(root) {
  // Nếu authed → fetch từ server, gộp với local
  let all = listGames(200);
  if (isAuthed()) {
    try {
      const remote = await apiGames.list(100);
      // merge: server games (có played_at_ms) + local games. Dedupe by id.
      const seen = new Set(all.map(g => g.id));
      for (const g of remote) {
        if (!seen.has(g.id)) all.push(g);
      }
      all.sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));
    } catch (e) {
      console.warn('[history] fetch backend failed', e);
    }
  }
  if (all.length === 0) {
    root.innerHTML = `
      <h1 class="page-h1">📜 ${esc(t('nav.history'))}</h1>
      <div class="empty-state">
        <div class="big-ico">🎯</div>
        <h2>${esc(t('history.empty.title'))}</h2>
        <p>${esc(t('history.empty.body'))}</p>
        <a class="btn btn-primary" href="#/home">${esc(t('btn.start_play'))}</a>
      </div>`;
    return;
  }

  // Filter state
  const state = { mode: 'all', result: 'all', variant: 'all', search: '' };

  function applyFilter(games) {
    return games.filter(g => {
      if (state.mode !== 'all' && g.mode !== state.mode) return false;
      if (state.result !== 'all') {
        const want = state.result;
        const r = g.result;
        if (want === 'win'  && !((g.userSide === 'r' && r === '1-0') || (g.userSide === 'b' && r === '0-1'))) return false;
        if (want === 'loss' && !((g.userSide === 'r' && r === '0-1') || (g.userSide === 'b' && r === '1-0'))) return false;
        if (want === 'draw' && r !== '1/2-1/2') return false;
      }
      if (state.variant !== 'all' && g.variant !== state.variant && !(state.variant === 'standard' && !g.variant)) return false;
      return true;
    });
  }

  function paint() {
    const list = applyFilter(all);
    const tbody = root.querySelector('#histBody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">${esc(t('history.no_match'))}</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(g => renderRow(g)).join('');
    tbody.querySelectorAll('[data-replay]').forEach(b => {
      b.addEventListener('click', () => location.hash = `#/replay/${b.dataset.replay}`);
    });
    tbody.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', async () => {
        if (await confirm({ title: t('history.delete'), body: `<p>${esc(t('history.delete.confirm'))}</p>`, okText: t('btn.confirm'), cancelText: t('btn.cancel') })) {
          deleteGame(b.dataset.del);
          paint();
        }
      });
    });
  }

  root.innerHTML = `
    <h1 class="page-h1">📜 ${esc(t('nav.history'))}</h1>
    <p class="page-sub">${esc(t('history.intro'))} — <strong>${all.length}</strong> ${esc(t('stats.games_short'))}</p>

    <div class="filter-bar">
      <select id="fMode">
        <option value="all">${esc(t('filter.all_modes'))}</option>
        <option value="bot">${esc(t('mode.bot'))}</option>
        <option value="local">${esc(t('mode.local'))}</option>
        <option value="daily">${esc(t('mode.daily'))}</option>
      </select>
      <select id="fResult">
        <option value="all">${esc(t('filter.all_results'))}</option>
        <option value="win">${esc(t('status.win'))}</option>
        <option value="loss">${esc(t('status.loss'))}</option>
        <option value="draw">${esc(t('status.draw'))}</option>
      </select>
      <select id="fVariant">
        <option value="all">${esc(t('filter.all_variants'))}</option>
        <option value="standard">${esc(t('variant.standard'))}</option>
        <option value="blind">${esc(t('variant.blind'))}</option>
      </select>
    </div>

    <div class="hist-table-wrap">
      <table class="hist-table">
        <thead>
          <tr>
            <th>${esc(t('history.col.when'))}</th>
            <th>${esc(t('history.col.opponent'))}</th>
            <th>${esc(t('history.col.mode'))}</th>
            <th>${esc(t('history.col.variant'))}</th>
            <th>${esc(t('history.col.result'))}</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="histBody"></tbody>
      </table>
    </div>
  `;

  root.querySelectorAll('select').forEach(sel => {
    sel.addEventListener('change', () => {
      state.mode = root.querySelector('#fMode').value;
      state.result = root.querySelector('#fResult').value;
      state.variant = root.querySelector('#fVariant').value;
      paint();
    });
  });

  paint();
}

function renderRow(g) {
  const when = new Date(g.playedAt).toLocaleString();
  const opp = g.mode === 'bot' ? `🤖 Bot Lv ${g.botLevel}` :
              g.mode === 'local' ? '👥 ' + (window.t ? window.t('mode.local') : 'Local') :
              g.mode === 'daily' ? '🎯 Daily' : 'Unknown';
  const userSide = g.userSide || 'r';
  let resTxt = '—', resCls = 'r-draw';
  if (g.result === '1-0' && userSide === 'r' || g.result === '0-1' && userSide === 'b') { resTxt = 'W'; resCls = 'r-win'; }
  else if (g.result === '0-1' && userSide === 'r' || g.result === '1-0' && userSide === 'b') { resTxt = 'L'; resCls = 'r-loss'; }
  else if (g.result === '1/2-1/2') { resTxt = 'D'; resCls = 'r-draw'; }
  const variant = g.variant === 'blind' ? '🎴 ' + (window.t ? window.t('variant.blind') : 'Blind') : '♟ Standard';
  return `<tr data-id="${g.id}">
    <td class="muted small">${esc(when)}</td>
    <td>${esc(opp)}</td>
    <td><span class="badge ${g.mode === 'bot' ? 'badge-jade':'badge-violet'}">${esc(g.mode)}</span></td>
    <td>${esc(variant)}</td>
    <td><span class="result-pill ${resCls}">${resTxt}</span> <span class="muted small">${esc(g.reason || '')}</span></td>
    <td class="actions">
      <button class="btn btn-sm" data-replay="${g.id}">▶</button>
      <button class="btn btn-sm btn-ghost" data-del="${g.id}">🗑</button>
    </td>
  </tr>`;
}

function deleteGame(id) {
  try {
    const arr = JSON.parse(localStorage.getItem('xq_history') || '[]');
    const next = arr.filter(g => g.id !== id);
    localStorage.setItem('xq_history', JSON.stringify(next));
  } catch {}
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
