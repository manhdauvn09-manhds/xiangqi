// Cờ Tướng Vương — Tournament Page
// Phase 3: Swiss / Knockout / Arena tournament system
import { t } from '../i18n/i18n.js';
import { isAuthed, getUser } from '../net/api.js';
import { toast, confirm } from './toast.js';

const API_BASE = document.querySelector('meta[name="xq-api-base"]')?.content || 'http://127.0.0.1:8787';

async function api(path, opts = {}) {
  const token = localStorage.getItem('xq_jwt');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function renderTournamentPage(root) {
  if (!isAuthed()) {
    root.innerHTML = `
      <h1 class="page-h1">🏆 ${esc(t('tournament.title'))}</h1>
      <div class="empty-state">
        <div class="big-ico">🔒</div>
        <h2>${esc(t('tournament.login_required'))}</h2>
        <p>${esc(t('tournament.login_msg'))}</p>
      </div>`;
    return;
  }

  root.innerHTML = `
    <h1 class="page-h1">🏆 ${esc(t('tournament.title'))}</h1>
    <p class="page-sub">${esc(t('tournament.intro'))}</p>

    <div class="tourn-actions">
      <button class="btn btn-primary" id="createTourn">➕ ${esc(t('tournament.create'))}</button>
      <select id="tournFilter">
        <option value="">${esc(t('filter.all'))}</option>
        <option value="upcoming">${esc(t('tournament.upcoming'))}</option>
        <option value="active">${esc(t('tournament.active'))}</option>
        <option value="finished">${esc(t('tournament.finished'))}</option>
      </select>
    </div>

    <div id="tournList" class="tourn-list">
      <div class="loading">⏳ ${esc(t('tournament.loading'))}</div>
    </div>

    <div id="tournDetail" class="tourn-detail" style="display:none"></div>
  `;

  const listEl = root.querySelector('#tournList');
  const detailEl = root.querySelector('#tournDetail');
  const filterSel = root.querySelector('#tournFilter');

  async function loadList() {
    try {
      const status = filterSel.value || undefined;
      const url = status ? `/api/tournaments?status=${status}` : '/api/tournaments';
      const list = await api(url);
      if (list.length === 0) {
        listEl.innerHTML = `<div class="empty-state"><div class="big-ico">🏟️</div><h3>${esc(t('tournament.none'))}</h3></div>`;
        return;
      }
      listEl.innerHTML = list.map(t => renderCard(t)).join('');
      listEl.querySelectorAll('[data-tourn]').forEach(btn => {
        btn.addEventListener('click', () => loadDetail(btn.dataset.tourn));
      });
    } catch (e) {
      listEl.innerHTML = `<div class="empty-state"><div class="big-ico">⚠️</div><p>${esc(t('tournament.load_error'))}</p></div>`;
    }
  }

  async function loadDetail(tid) {
    try {
      const data = await api(`/api/tournaments/${tid}`);
      detailEl.style.display = '';
      detailEl.innerHTML = renderDetail(data);
      detailEl.scrollIntoView({ behavior: 'smooth' });

      // Bind buttons
      const joinBtn = detailEl.querySelector('#joinTourn');
      const leaveBtn = detailEl.querySelector('#leaveTourn');
      const startBtn = detailEl.querySelector('#startTourn');

      joinBtn?.addEventListener('click', async () => {
        try {
          await api(`/api/tournaments/${tid}/join`, { method: 'POST' });
          toast(t('tournament.joined'));
          loadDetail(tid);
        } catch (e) { toast(t('tournament.join_error'), { type: 'error' }); }
      });
      leaveBtn?.addEventListener('click', async () => {
        try {
          await api(`/api/tournaments/${tid}/leave`, { method: 'POST' });
          toast(t('tournament.left'));
          loadDetail(tid);
        } catch (e) { toast(t('tournament.leave_error'), { type: 'error' }); }
      });
      startBtn?.addEventListener('click', async () => {
        if (!(await confirm({ title: t('tournament.start_confirm'), body: `<p>${esc(t('tournament.start_msg'))}</p>` }))) return;
        try {
          await api(`/api/tournaments/${tid}/start`, { method: 'POST' });
          toast(t('tournament.started'));
          loadDetail(tid);
          loadList();
        } catch (e) { toast(t('tournament.start_error'), { type: 'error' }); }
      });
    } catch (e) {
      detailEl.innerHTML = `<p class="error">${esc(t('tournament.load_error'))}</p>`;
    }
  }

  // Create tournament modal
  root.querySelector('#createTourn').addEventListener('click', async () => {
    const ok = await confirm({
      title: t('tournament.create'),
      body: `
        <div class="form-grid" style="gap:12px">
          <div><label>${esc(t('tournament.name'))}</label>
            <input type="text" id="tName" placeholder="My Tournament" maxlength="80"></div>
          <div><label>${esc(t('tournament.format_label'))}</label>
            <select id="tFormat">
              <option value="swiss">♟ Swiss</option>
              <option value="knockout">🥊 Knockout</option>
              <option value="arena">⚔️ Arena</option>
            </select></div>
          <div><label>${esc(t('tournament.max_players'))}</label>
            <input type="number" id="tMax" value="16" min="4" max="256"></div>
          <div><label>${esc(t('tournament.starts_in'))}</label>
            <select id="tStart">
              <option value="5">5 ${esc(t('time.minutes'))}</option>
              <option value="15">15 ${esc(t('time.minutes'))}</option>
              <option value="30">30 ${esc(t('time.minutes'))}</option>
              <option value="60">1 ${esc(t('time.hour'))}</option>
            </select></div>
        </div>
      `,
      okText: t('btn.create'),
      cancelText: t('btn.cancel'),
    });
    if (!ok) return;
    const name = document.getElementById('tName')?.value?.trim();
    if (!name || name.length < 3) { toast(t('tournament.name_required'), { type: 'warn' }); return; }
    try {
      const data = await api('/api/tournaments', {
        method: 'POST',
        body: JSON.stringify({
          name,
          format: document.getElementById('tFormat')?.value || 'swiss',
          max_players: parseInt(document.getElementById('tMax')?.value) || 16,
          starts_in_minutes: parseInt(document.getElementById('tStart')?.value) || 15,
        }),
      });
      toast(t('tournament.created'));
      loadList();
      loadDetail(data.id);
    } catch (e) {
      toast(t('tournament.create_error'), { type: 'error' });
    }
  });

  filterSel.addEventListener('change', loadList);
  loadList();
}

function renderCard(t) {
  const statusBadge = {
    upcoming: '🟡 Upcoming',
    active: '🟢 Active',
    finished: '⚪ Finished',
    cancelled: '🔴 Cancelled',
  }[t.status] || t.status;
  const time = new Date(t.startsAt).toLocaleString();
  return `
    <div class="tourn-card" data-tourn="${t.id}">
      <div class="tourn-card-head">
        <span class="tourn-fmt badge ${t.format === 'swiss' ? 'badge-jade' : t.format === 'knockout' ? 'badge-violet' : 'badge-gold'}">${esc(t.format)}</span>
        <span class="tourn-status">${statusBadge}</span>
      </div>
      <h3>${esc(t.name)}</h3>
      <div class="tourn-meta">
        <span>👥 ${t.playerCount}/${t.maxPlayers}</span>
        <span>🕐 ${esc(time)}</span>
        <span>⏱ ${esc(t.variant)}</span>
      </div>
    </div>
  `;
}

function renderDetail(data) {
  const user = getUser();
  const isCreator = user && data.standings?.some(s => s.user_id === user.id);
  const isJoined = data.standings?.some(s => s.user_id === user?.id);

  let actions = '';
  if (data.status === 'upcoming') {
    if (isJoined) {
      actions = `<button class="btn btn-danger btn-sm" id="leaveTourn">🚪 Leave</button>`;
    } else {
      actions = `<button class="btn btn-primary" id="joinTourn">✅ Join Tournament</button>`;
    }
    if (user?.id === data.creatorId) {
      actions += ` <button class="btn btn-lg" id="startTourn">🚀 Start Now</button>`;
    }
  }

  const standingsHTML = (data.standings || []).map((s, i) => `
    <tr class="${s.user_id === user?.id ? 'highlight' : ''} ${s.eliminated ? 'eliminated' : ''}">
      <td><strong>${s.rank}</strong> ${i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</td>
      <td>${esc(s.display_name)}</td>
      <td><strong>${s.score}</strong></td>
      <td>${s.wins}W ${s.losses}L ${s.draws}D</td>
      <td class="muted">${s.elo}</td>
    </tr>
  `).join('');

  const matchesHTML = (data.matches || []).map(m => {
    const redName = data.standings?.find(s => s.user_id === m.red)?.display_name || '?';
    const blackName = data.standings?.find(s => s.user_id === m.black)?.display_name || '?';
    return `
      <tr>
        <td>R${m.round}</td>
        <td class="${m.result === '1-0' ? 'r-win' : ''}">${esc(redName)}</td>
        <td class="muted">vs</td>
        <td class="${m.result === '0-1' ? 'r-win' : ''}">${esc(blackName)}</td>
        <td>${m.result || '⏳'}</td>
      </tr>
    `;
  }).join('');

  return `
    <button class="btn btn-ghost btn-sm" onclick="this.parentElement.style.display='none'">← Back</button>
    <h2>${esc(data.name)}</h2>
    <div class="tourn-info-bar">
      <span class="badge badge-jade">${esc(data.format)}</span>
      <span>Round ${data.currentRound}/${data.rounds || '?'}</span>
      <span>👥 ${data.playerCount}/${data.maxPlayers}</span>
      <span>${data.status}</span>
    </div>
    ${data.description ? `<p class="muted">${esc(data.description)}</p>` : ''}
    <div class="tourn-actions">${actions}</div>

    <h3>📊 Standings</h3>
    <div class="lb-table-wrap">
      <table class="lb-table">
        <thead><tr><th>#</th><th>Player</th><th>Score</th><th>Record</th><th>ELO</th></tr></thead>
        <tbody>${standingsHTML || '<tr><td colspan="5" class="muted">No players yet</td></tr>'}</tbody>
      </table>
    </div>

    ${matchesHTML ? `
      <h3>⚔️ Matches</h3>
      <div class="lb-table-wrap">
        <table class="lb-table">
          <thead><tr><th>Round</th><th>Red</th><th></th><th>Black</th><th>Result</th></tr></thead>
          <tbody>${matchesHTML}</tbody>
        </table>
      </div>
    ` : ''}
  `;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
