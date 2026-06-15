// Cờ Tướng Vương — Leaderboard (live từ backend + fallback local)
import { t } from '../i18n/i18n.js';
import { getProfile } from '../storage/local.js';
import { ALL_RANKS, getRank } from '../elo/elo.js';
import { ratings } from '../net/api.js';

export async function renderLeaderboardPage(root) {
  const me = getProfile();
  const myRank = getRank(me.elo);

  root.innerHTML = `
    <h1 class="page-h1">🏆 ${esc(t('nav.leaderboard'))}</h1>
    <div class="lb-controls">
      <div class="lb-tier-tabs" id="lbTiers">
        <button class="lb-tab active" data-tier="all">Tất cả</button>
        ${[...ALL_RANKS].reverse().map(r =>
          `<button class="lb-tab" data-tier="${r.name}" title="${t('rank.' + r.name)}" style="color:${r.color}">${r.icon}</button>`
        ).join('')}
      </div>
      <input type="search" class="lb-search text-input" id="lbSearch" placeholder="🔍 Tìm người chơi…" style="max-width:200px">
    </div>
    <div id="lbContent"><div class="muted" style="padding:20px">Đang tải…</div></div>
  `;

  let leaders = [], isLive = false;
  try {
    const live = await ratings.leaderboard('standard', 100);
    if (Array.isArray(live) && live.length > 0) {
      leaders = live.map((r, i) => ({
        rank: i + 1,
        name: r.display_name || r.displayName || '?',
        elo: r.elo,
        wins: r.wins || 0,
        losses: r.losses || 0,
        draws: r.draws || 0,
        gamesPlayed: r.games_played || r.gamesPlayed || 0,
        isMe: !!(me.name && (r.display_name === me.name || r.displayName === me.name)),
      }));
      isLive = true;
    }
  } catch { /* keep empty */ }

  let activeTier = 'all', search = '';

  function filtered() {
    return leaders.filter(l => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeTier !== 'all' && getRank(l.elo).name !== activeTier) return false;
      return true;
    });
  }

  function renderContent() {
    const el = root.querySelector('#lbContent');
    if (!el) return;
    const list = filtered();
    const myEntry = leaders.find(l => l.isMe);
    const myRankNum = myEntry ? myEntry.rank : null;

    el.innerHTML = `
      <div class="lb-banner${isLive ? '' : ' warn'}">
        ${isLive
          ? `<span class="lb-badge live">🌐 LIVE · ${leaders.length} người chơi</span>
             ${myRankNum ? `<span class="muted small">Hạng của bạn: <strong>#${myRankNum}</strong></span>` : ''}`
          : `<span class="lb-badge">📴 Offline — đăng nhập để xem BXH thật</span>`
        }
      </div>

      <div class="lb-self">
        <div class="lb-self-rank" style="color:${myRank.color}">${myRank.icon}</div>
        <div class="lb-self-info">
          <div class="lb-self-name">👤 ${esc(me.name || 'Bạn')}</div>
          <div class="muted small">${esc(t('rank.' + myRank.name))} · ELO ${me.elo} · ${me.wins || 0}W / ${me.losses || 0}L / ${me.draws || 0}D</div>
        </div>
        ${myRankNum ? `<div class="lb-self-pos">#${myRankNum}</div>` : ''}
      </div>

      ${list.length === 0 ? `<div class="empty-state"><p>Không tìm thấy người chơi</p></div>` : `
        <div class="lb-table-wrap">
          <table class="lb-table">
            <thead><tr>
              <th>#</th>
              <th>Người chơi</th>
              <th>ELO</th>
              <th>Hạng</th>
              <th class="hide-sm">Ván</th>
              <th class="hide-sm">W / L / D</th>
              <th class="hide-sm">Win%</th>
            </tr></thead>
            <tbody>
              ${list.map(l => {
                const r = getRank(l.elo);
                const podium = l.rank === 1 ? '👑' : l.rank === 2 ? '🥈' : l.rank === 3 ? '🥉' : '';
                const cls = (l.rank <= 3 ? `top-${l.rank}` : '') + (l.isMe ? ' lb-me' : '');
                const wp = l.gamesPlayed > 0 ? Math.round(l.wins / l.gamesPlayed * 100) : 0;
                const wpCls = wp >= 60 ? 'winpct good' : wp >= 40 ? 'winpct ok' : 'winpct low';
                return `<tr class="${cls.trim()}">
                  <td>${podium || `<span class="muted">${l.rank}</span>`}</td>
                  <td>${l.isMe ? '<span class="lb-you">你</span> ' : ''}${esc(l.name)}</td>
                  <td><strong>${l.elo}</strong></td>
                  <td><span style="color:${r.color}">${r.icon} ${esc(t('rank.' + r.name))}</span></td>
                  <td class="hide-sm muted small">${l.gamesPlayed}</td>
                  <td class="hide-sm muted small">${l.wins}/${l.losses}/${l.draws}</td>
                  <td class="hide-sm"><span class="${wpCls}">${wp}%</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}

      <section class="lb-section" style="margin-top:24px">
        <h3>🪜 ${esc(t('lb.rank_ladder'))}</h3>
        <div class="rank-ladder">
          ${ALL_RANKS.map(r => `
            <div class="rank-row ${r.name === myRank.name ? 'here' : ''}">
              <span class="ico" style="color:${r.color}">${r.icon}</span>
              <span class="t">${esc(t('rank.' + r.name))}</span>
              <span class="muted small">${r.min}+</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  renderContent();

  root.querySelector('#lbTiers').addEventListener('click', e => {
    const btn = e.target.closest('[data-tier]');
    if (!btn) return;
    activeTier = btn.dataset.tier;
    root.querySelectorAll('.lb-tab').forEach(b => b.classList.toggle('active', b === btn));
    renderContent();
  });

  let debounce;
  root.querySelector('#lbSearch').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { search = e.target.value; renderContent(); }, 200);
  });
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
