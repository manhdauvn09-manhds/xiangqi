// Cờ Tướng Vương — Profile page
import { t } from '../i18n/i18n.js';
import { getProfile, listGames } from '../storage/local.js';
import { getRank, ALL_RANKS } from '../elo/elo.js';
import { isAuthed, games as apiGames } from '../net/api.js';

export async function renderProfilePage(root) {
  const p = getProfile();
  const rank = getRank(p.elo);
  const winRate = p.gamesPlayed > 0 ? Math.round(p.wins / p.gamesPlayed * 100) : 0;

  // Fetch remote games if authed
  let games = listGames(200);
  if (isAuthed()) {
    try {
      const remote = await apiGames.list(100);
      const seen = new Set(games.map(g => g.id));
      for (const g of remote) { if (!seen.has(g.id)) games.push(g); }
      games.sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));
    } catch { /* keep local */ }
  }

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

  const ladderPct = Math.min(100, Math.max(0, (p.elo - 600) / (2400 - 600) * 100));

  // Build ELO history from recent games (last 15, working backwards from current ELO)
  const eloHistory = buildEloHistory(games.slice(0, 15), p.elo);

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

    ${eloHistory.length >= 3 ? `
    <section class="prof-section">
      <h3>📈 ELO theo thời gian <span class="muted small">(${eloHistory.length} ván gần nhất)</span></h3>
      ${renderSparkline(eloHistory, p.elo)}
    </section>` : ''}

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
        ELO ${p.elo} · cần ${nextRankElo(p.elo) > p.elo ? nextRankElo(p.elo) - p.elo + ' ELO nữa lên hạng tiếp' : 'Đỉnh cao!'}
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

function buildEloHistory(games, currentElo) {
  // Work backwards: current ELO → subtract deltas to get past ELOs
  const sorted = [...games].filter(g => g.eloChange != null).sort((a,b) => (b.playedAt||0) - (a.playedAt||0));
  const points = [];
  let elo = currentElo;
  for (const g of sorted) {
    points.unshift({ elo, delta: g.eloChange });
    elo -= (g.eloChange || 0);
  }
  points.push({ elo: currentElo, delta: 0, current: true });
  return points;
}

function renderSparkline(points, currentElo) {
  const W = 300, H = 60, PAD = 8;
  const elos = points.map(p => p.elo);
  const min = Math.min(...elos) - 10;
  const max = Math.max(...elos) + 10;
  const range = max - min || 1;
  const toX = i => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const toY = v => H - PAD - ((v - min) / range) * (H - PAD * 2);

  const pts = points.map((p, i) => `${toX(i)},${toY(p.elo)}`).join(' ');
  const fillPts = `${toX(0)},${H} ${pts} ${toX(points.length-1)},${H}`;

  // trend color
  const trend = points[points.length-1].elo - points[0].elo;
  const stroke = trend >= 0 ? '#48c78e' : '#ff7675';
  const fill = trend >= 0 ? 'rgba(72,199,142,0.12)' : 'rgba(255,118,117,0.12)';

  return `
    <div class="elo-chart">
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="display:block">
        <polygon points="${fillPts}" fill="${fill}"/>
        <polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${points.map((p, i) => `
          <circle cx="${toX(i)}" cy="${toY(p.elo)}" r="${p.current ? 4 : 2.5}"
            fill="${p.current ? stroke : 'var(--xq-bg-surface)'}" stroke="${stroke}" stroke-width="1.5"/>
        `).join('')}
      </svg>
      <div class="elo-chart-labels">
        <span class="muted small">${elos[0]}</span>
        <span class="${trend >= 0 ? 'text-win' : 'text-loss'} small"><strong>${trend >= 0 ? '+' : ''}${trend}</strong></span>
        <span class="muted small">${currentElo}</span>
      </div>
    </div>
  `;
}

function nextRankElo(elo) {
  for (const r of ALL_RANKS) { if (r.min > elo) return r.min; }
  return elo;
}

function renderBars(byMode) {
  const keys = Object.keys(byMode);
  if (!keys.length) return `<p class="muted">${esc('Chưa có dữ liệu')}</p>`;
  return keys.map(k => {
    const m = byMode[k]; const total = m.games || 1;
    const wp = m.w/total*100, lp = m.l/total*100, dp = m.d/total*100;
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
    const m = byVariant[v]; const total = m.w+m.l+m.d;
    if (!total) continue;
    const wp = m.w/total*100, lp = m.l/total*100, dp = m.d/total*100;
    out.push(`<div class="prof-row">
      <div class="prof-row-l">${v === 'blind' ? '🎴 Cờ Úp' : '♟ Cờ Ngửa'}</div>
      <div class="bar"><div class="b-w" style="width:${wp}%"></div><div class="b-l" style="width:${lp}%"></div><div class="b-d" style="width:${dp}%"></div></div>
      <div class="prof-row-r muted small">${m.w}W ${m.l}L ${m.d}D</div>
    </div>`);
  }
  return out.join('') || `<p class="muted">Chưa có dữ liệu</p>`;
}

function renderRecent(games) {
  if (!games.length) return `<p class="muted">Chưa có ván nào</p>`;
  return `<div class="recent-grid">${games.map(g => {
    const us = g.userSide || 'r';
    let r = 'D', cls = 'r-draw';
    if ((g.result==='1-0'&&us==='r')||(g.result==='0-1'&&us==='b')) { r='W'; cls='r-win'; }
    else if ((g.result==='0-1'&&us==='r')||(g.result==='1-0'&&us==='b')) { r='L'; cls='r-loss'; }
    const opp = g.mode==='bot' ? `Bot Lv${g.botLevel}` : g.mode==='local' ? 'Local' : g.mode || '?';
    const delta = g.eloChange != null ? `<div class="elo-delta ${g.eloChange>=0?'pos':'neg'}">${g.eloChange>=0?'+':''}${g.eloChange}</div>` : '';
    return `<a class="recent-tile" href="#/replay/${g.id}">
      <div class="result-pill ${cls}">${r}</div>
      <div class="t">${esc(opp)}</div>
      ${delta}
      <div class="muted small">${esc(new Date(g.playedAt).toLocaleDateString())}</div>
    </a>`;
  }).join('')}</div>`;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
