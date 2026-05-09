// Cờ Tướng Vương — Leaderboard (loads từ backend, fallback mock)
import { t } from '../i18n/i18n.js';
import { getProfile } from '../storage/local.js';
import { ALL_RANKS, getRank } from '../elo/elo.js';
import { ratings } from '../net/api.js';

// Mock leaderboard (Phase 2 sẽ fetch từ backend thật)
const MOCK_LEADERS = [
  { rank: 1,  name: 'SuCo_TLong',     elo: 2612, region: 'HN' },
  { rank: 2,  name: 'QuanVuong_VN',   elo: 2487, region: 'HCM' },
  { rank: 3,  name: 'DaiThanh_AI',    elo: 2454, region: 'DN' },
  { rank: 4,  name: 'CoSu_DongHo',    elo: 2398, region: 'HN' },
  { rank: 5,  name: 'PhongTrieu',     elo: 2356, region: 'HCM' },
  { rank: 6,  name: 'XaThuVN',        elo: 2298, region: 'HN' },
  { rank: 7,  name: 'ThietMa_HCM',    elo: 2210, region: 'HCM' },
  { rank: 8,  name: 'PhaoDau_LegV',   elo: 2087, region: 'DN' },
  { rank: 9,  name: 'KhaiCuoc_88',    elo: 1945, region: 'CT' },
  { rank: 10, name: 'TuongQuan',      elo: 1872, region: 'HN' },
];

export async function renderLeaderboardPage(root) {
  const me = getProfile();
  const myRank = getRank(me.elo);

  // Try fetch real leaderboard, fallback mock
  let leaders = MOCK_LEADERS;
  let isLive = false;
  try {
    const live = await ratings.leaderboard('standard', 100);
    if (Array.isArray(live) && live.length > 0) {
      leaders = live.map((r, i) => ({
        rank: i + 1,
        name: r.display_name || r.displayName,
        elo: r.elo,
        region: '—',
      }));
      isLive = true;
    }
  } catch (e) { /* keep mock */ }

  root.innerHTML = `
    <h1 class="page-h1">🏆 ${esc(t('nav.leaderboard'))}</h1>
    <div class="lb-banner">
      <span class="lb-badge">${isLive ? '🌐 LIVE' : esc(t('lb.local_mode'))}</span>
      <span class="muted">${isLive ? `${leaders.length} players from backend` : esc(t('lb.online_coming'))}</span>
    </div>

    <section class="lb-section">
      <h3>👤 ${esc(t('lb.your_position'))}</h3>
      <div class="lb-self">
        <div class="lb-self-rank" style="color:${myRank.color}">${myRank.icon}</div>
        <div class="lb-self-info">
          <div class="lb-self-name">${esc(me.name || t('side.you'))}</div>
          <div class="muted small">${esc(t('rank.' + myRank.name))} · ELO ${me.elo} · ${me.gamesPlayed} ${esc(t('stats.games_short'))}</div>
        </div>
      </div>
    </section>

    <section class="lb-section">
      <h3>🌍 ${esc(t('lb.global_top'))} <span class="muted small">(${esc(t('lb.demo'))})</span></h3>
      <div class="lb-table-wrap">
        <table class="lb-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${esc(t('lb.player'))}</th>
              <th>ELO</th>
              <th>${esc(t('lb.rank'))}</th>
              <th>${esc(t('lb.region'))}</th>
            </tr>
          </thead>
          <tbody>
            ${leaders.map(l => {
              const r = getRank(l.elo);
              const top3 = l.rank <= 3 ? `top-${l.rank}` : '';
              const podium = l.rank === 1 ? '👑' : l.rank === 2 ? '🥈' : l.rank === 3 ? '🥉' : '';
              return `<tr class="${top3}">
                <td><strong>${l.rank}</strong> ${podium}</td>
                <td>${esc(l.name)}</td>
                <td><strong>${l.elo}</strong></td>
                <td><span style="color:${r.color}">${r.icon} ${esc(t('rank.' + r.name))}</span></td>
                <td class="muted small">${esc(l.region)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="lb-section">
      <h3>🪜 ${esc(t('lb.rank_ladder'))}</h3>
      <div class="rank-ladder">
        ${ALL_RANKS.map(r => `
          <div class="rank-row ${r.name === myRank.name ? 'here' : ''}">
            <span class="ico" style="color:${r.color}">${r.icon}</span>
            <span class="t">${esc(t('rank.' + r.name))}</span>
            <span class="muted small">${r.min}+ ELO</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
