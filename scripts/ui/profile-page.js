// Cờ Tướng Vương — Profile page
import { t } from '../i18n/i18n.js';
import { getProfile, listGames } from '../storage/local.js';
import { getRank, ALL_RANKS } from '../elo/elo.js';

export function renderProfilePage(root) {
  const p = getProfile();
  const games = listGames(200);
  const rank = getRank(p.elo);
  const winRate = p.gamesPlayed > 0 ? Math.round(p.wins / p.gamesPlayed * 100) : 0;

  // Stats by mode
  const byMode = {};
  const byVariant = { standard: { w:0,l:0,d:0 }, blind: { w:0,l:0,d:0 } };
  for (const g of games) {
    byMode[g.mode] = byMode[g.mode] || { games:0, w:0, l:0, d:0 };
    byMode[g.mode].games++;
    const v = g.variant === 'blind' ? 'blind' : 'standard';
    const us = g.userSide || 'r';
    if ((g.result === '1-0' && us === 'r') || (g.result === '0-1' && us === 'b')) { byMode[g.mode].w++; byVariant[v].w++; }
    else if ((g.result === '0-1' && us === 'r') || (g.result === '1-0' && us === 'b')) { byMode[g.mode].l++; byVariant[v].l++; }
    else if (g.result === '1/2-1/2') { byMode[g.mode].d++; byVariant[v].d++; }
  }

  // Build "ELO ladder" position
  const ladderIdx = ALL_RANKS.findIndex(r => r.name === rank.name);
  const ladderPct = Math.min(100, Math.max(0, (p.elo - 600) / (2400 - 600) * 100));

  root.innerHTML = `
    <div class="profile-hero">
      <div class="ph-av">${esc((p.name || 'You').slice(0,2).toUpperCase())}</div>
      <div class="ph-info">
        <h1>${esc(p.name || t('side.you'))}</h1>
        <div class="ph-tags">
          <span class="rank-pill" style="color:${rank.color}">${rank.icon} ${esc(t('rank.' + rank.name))}</span>
          <span class="badge">ELO ${p.elo}</span>
          <span class="badge">${p.gamesPlayed} ${esc(t('stats.games_short'))}</span>
        </div>
      </div>
    </div>

    <div class="profile-stats">
      <div class="stat-tile">
        <div class="lbl">${esc(t('profile.elo'))}</div>
        <div class="val gradient">${p.elo}</div>
        <div class="sub">${esc(t('profile.start_at_1200'))}</div>
      </div>
      <div class="stat-tile">
        <div class="lbl">${esc(t('profile.win_rate'))}</div>
        <div class="val win">${winRate}%</div>
        <div class="sub">${p.wins}W / ${p.losses}L / ${p.draws}D</div>
      </div>
      <div class="stat-tile">
        <div class="lbl">${esc(t('profile.rank'))}</div>
        <div class="val" style="color:${rank.color}">${rank.icon}</div>
        <div class="sub">${esc(t('rank.' + rank.name))}</div>
      </div>
      <div class="stat-tile">
        <div class="lbl">${esc(t('profile.games'))}</div>
        <div class="val">${p.gamesPlayed}</div>
        <div class="sub">${esc(t('profile.recent_avg'))}</div>
      </div>
    </div>

    <section class="prof-section">
      <h3>📈 ${esc(t('profile.ladder'))}</h3>
      <div class="ladder">
        <div class="ladder-bar"></div>
        <div class="ladder-marker" style="left: calc(${ladderPct}% - 14px)">${rank.icon}</div>
        <div class="ladder-labels">
          ${ALL_RANKS.map(r => `<span ${r.name === rank.name ? 'class="here"' : ''}>${r.icon}</span>`).join('')}
        </div>
      </div>
      <div class="muted small" style="text-align:center; margin-top:10px;">
        ${ladderIdx + 1} / ${ALL_RANKS.length}
      </div>
    </section>

    <section class="prof-section">
      <h3>📊 ${esc(t('profile.by_mode'))}</h3>
      ${renderBars(byMode)}
    </section>

    <section class="prof-section">
      <h3>♟ ${esc(t('profile.by_variant'))}</h3>
      ${renderVariantBars(byVariant)}
    </section>

    <section class="prof-section">
      <h3>📜 ${esc(t('profile.recent_games'))}</h3>
      ${renderRecent(games.slice(0, 10))}
    </section>
  `;
}

function renderBars(byMode) {
  const keys = Object.keys(byMode);
  if (keys.length === 0) return `<p class="muted">${esc(window.t ? window.t('profile.no_data') : 'Chưa có dữ liệu')}</p>`;
  return keys.map(k => {
    const m = byMode[k];
    const total = m.games || 1;
    const wp = m.w / total * 100, lp = m.l / total * 100, dp = m.d / total * 100;
    return `<div class="prof-row">
      <div class="prof-row-l">${esc(k)}</div>
      <div class="bar"><div class="b-w" style="width:${wp}%"></div><div class="b-l" style="width:${lp}%"></div><div class="b-d" style="width:${dp}%"></div></div>
      <div class="prof-row-r muted small">${m.w}W ${m.l}L ${m.d}D</div>
    </div>`;
  }).join('');
}

function renderVariantBars(byVariant) {
  const out = [];
  for (const v of ['standard','blind']) {
    const m = byVariant[v];
    const total = (m.w + m.l + m.d) || 0;
    if (total === 0) continue;
    const wp = m.w / total * 100, lp = m.l / total * 100, dp = m.d / total * 100;
    out.push(`<div class="prof-row">
      <div class="prof-row-l">${v === 'blind' ? '🎴 Cờ Úp' : '♟ Cờ Ngửa'}</div>
      <div class="bar"><div class="b-w" style="width:${wp}%"></div><div class="b-l" style="width:${lp}%"></div><div class="b-d" style="width:${dp}%"></div></div>
      <div class="prof-row-r muted small">${m.w}W ${m.l}L ${m.d}D</div>
    </div>`);
  }
  return out.join('') || `<p class="muted">${esc('Chưa có dữ liệu')}</p>`;
}

function renderRecent(games) {
  if (games.length === 0) return `<p class="muted">${esc('Chưa có ván nào')}</p>`;
  return `<div class="recent-grid">${games.map(g => {
    const us = g.userSide || 'r';
    let r = 'D', cls = 'r-draw';
    if ((g.result === '1-0' && us === 'r') || (g.result === '0-1' && us === 'b')) { r = 'W'; cls = 'r-win'; }
    else if ((g.result === '0-1' && us === 'r') || (g.result === '1-0' && us === 'b')) { r = 'L'; cls = 'r-loss'; }
    const opp = g.mode === 'bot' ? `Bot Lv${g.botLevel}` : g.mode;
    return `<a class="recent-tile" href="#/replay/${g.id}">
      <div class="result-pill ${cls}">${r}</div>
      <div class="t">${esc(opp)}</div>
      <div class="muted small">${esc(new Date(g.playedAt).toLocaleDateString())}</div>
    </a>`;
  }).join('')}</div>`;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
