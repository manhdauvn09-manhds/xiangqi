// Cờ Tướng Vương — Profile page (local + server sync, ELO delta, achievements)
import { t } from '../i18n/i18n.js';
import { getProfile, listGames } from '../storage/local.js';
import { getRank, ALL_RANKS } from '../elo/elo.js';
import { isAuthed, getUser, ratings } from '../net/api.js';
import { getAchievements } from './achievements.js';

export async function renderProfilePage(root) {
  const p     = getProfile();
  const games = listGames(200);
  const rank  = getRank(p.elo);
  const wr    = p.gamesPlayed > 0 ? Math.round(p.wins / p.gamesPlayed * 100) : 0;

  // Fetch server ELO nếu authed
  let serverElo = null;
  const cu = getUser();
  if (isAuthed() && cu) {
    try { serverElo = await ratings.ofUser(cu.id, 'standard'); } catch (_) {}
  }

  const displayElo  = serverElo?.elo ?? p.elo;
  const displayRank = getRank(displayElo);

  const byMode = {};
  const byVariant = { standard:{w:0,l:0,d:0,g:0}, blind:{w:0,l:0,d:0,g:0} };
  for (const g of games) {
    byMode[g.mode] = byMode[g.mode] || {g:0,w:0,l:0,d:0};
    byMode[g.mode].g++;
    const v  = g.variant==='blind' ? 'blind' : 'standard';
    const us = g.userSide || 'r';
    if ((g.result==='1-0'&&us==='r')||(g.result==='0-1'&&us==='b')) { byMode[g.mode].w++; byVariant[v].w++; }
    else if ((g.result==='0-1'&&us==='r')||(g.result==='1-0'&&us==='b')) { byMode[g.mode].l++; byVariant[v].l++; }
    else if (g.result==='1/2-1/2') { byMode[g.mode].d++; byVariant[v].d++; }
    byVariant[v].g++;
  }

  const ladderPct = Math.min(100, Math.max(0, (displayElo-600)/(2400-600)*100));
  const ladderIdx = ALL_RANKS.findIndex(r => r.name===displayRank.name);
  const eloHistory = buildEloHistory(games.slice(0,20));
  const allAch  = getAchievements();
  const earned  = allAch.filter(a => a.earned);
  const locked  = allAch.filter(a => !a.earned);

  root.innerHTML = `
    <div class="profile-hero">
      <div class="ph-av" style="background:${displayRank.color}">${esc((p.name||'You').slice(0,2).toUpperCase())}</div>
      <div class="ph-info">
        <h1>${esc(p.name || t('side.you'))}</h1>
        <div class="ph-tags">
          <span class="rank-pill" style="color:${displayRank.color}">${displayRank.icon} ${esc(t('rank.'+displayRank.name))}</span>
          <span class="badge">ELO ${displayElo}</span>
          <span class="badge">${p.gamesPlayed} ${esc(t('stats.games_short'))}</span>
          ${serverElo ? '<span class="badge" style="background:rgba(72,199,142,0.2);color:#48c78e;font-size:11px">🌐 Live</span>' : ''}
        </div>
      </div>
    </div>

    <div class="profile-stats">
      <div class="stat-tile">
        <div class="lbl">ELO</div>
        <div class="val gradient">${displayElo}</div>
        <div class="sub">${serverElo?.peak_elo ? 'Đỉnh: '+serverElo.peak_elo : esc(t('profile.start_at_1200'))}</div>
      </div>
      <div class="stat-tile">
        <div class="lbl">${esc(t('profile.win_rate'))}</div>
        <div class="val win">${wr}%</div>
        <div class="sub">${p.wins}W / ${p.losses}L / ${p.draws}D</div>
      </div>
      <div class="stat-tile">
        <div class="lbl">${esc(t('profile.rank'))}</div>
        <div class="val" style="color:${displayRank.color}">${displayRank.icon}</div>
        <div class="sub">${esc(t('rank.'+displayRank.name))}</div>
      </div>
      <div class="stat-tile">
        <div class="lbl">Huy hiệu</div>
        <div class="val">${earned.length}</div>
        <div class="sub">/ ${allAch.length} tổng</div>
      </div>
    </div>

    <section class="prof-section">
      <h3>📈 ${esc(t('profile.ladder'))}</h3>
      <div class="ladder">
        <div class="ladder-bar"></div>
        <div class="ladder-marker" style="left: calc(${ladderPct}% - 14px)">${displayRank.icon}</div>
        <div class="ladder-labels">
          ${ALL_RANKS.map(r => `<span ${r.name===displayRank.name?'class="here"':''}>${r.icon}</span>`).join('')}
        </div>
      </div>
      <div class="muted small" style="text-align:center;margin-top:10px">
        Hạng ${ladderIdx+1} / ${ALL_RANKS.length}${nextEloNeeded(displayElo) ? ' · Cần thêm '+nextEloNeeded(displayElo)+' ELO lên hạng tiếp' : ' · Hạng cao nhất!'}
      </div>
    </section>

    ${eloHistory.length >= 3 ? `
    <section class="prof-section">
      <h3>📊 Biến động ELO (${eloHistory.length} ván)</h3>
      ${renderEloSparkline(eloHistory)}
    </section>` : ''}

    <section class="prof-section">
      <h3>🏅 Huy hiệu (${earned.length}/${allAch.length})</h3>
      <div class="ach-grid" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
        ${earned.map(a => `
          <div title="${esc(a.desc)}" style="display:flex;flex-direction:column;align-items:center;
            background:rgba(102,126,234,0.15);border:1px solid rgba(102,126,234,0.3);
            border-radius:10px;padding:10px 14px;min-width:90px;cursor:default">
            <div style="font-size:22px">${a.icon}</div>
            <div style="font-size:11px;font-weight:700;margin-top:4px;text-align:center">${esc(a.title)}</div>
          </div>`).join('')}
        ${locked.slice(0,6).map(a => `
          <div title="${esc(a.desc)}" style="display:flex;flex-direction:column;align-items:center;
            background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);
            border-radius:10px;padding:10px 14px;min-width:90px;cursor:default;opacity:0.45">
            <div style="font-size:22px">🔒</div>
            <div style="font-size:11px;font-weight:700;margin-top:4px;text-align:center">${esc(a.title)}</div>
          </div>`).join('')}
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

function buildEloHistory(games) {
  const result = [];
  for (const g of [...games].reverse()) {
    if (g.eloDelta == null) continue;
    const prev = result.length ? result[result.length-1].elo : 1200;
    result.push({ elo: prev + g.eloDelta, delta: g.eloDelta });
  }
  return result;
}

function renderEloSparkline(history) {
  const elos = history.map(h => h.elo);
  const min  = Math.min(...elos) - 15;
  const max  = Math.max(...elos) + 15;
  const W = 300, H = 55;
  const pts = elos.map((e,i) => {
    const x = elos.length > 1 ? (i/(elos.length-1))*W : W/2;
    const y = H - ((e-min)/(max-min))*H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = elos[elos.length-1] >= elos[0] ? '#48c78e' : '#ff7675';
  return `<svg viewBox="0 0 ${W} ${H+20}" style="width:100%;max-width:360px;display:block;overflow:visible">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    ${elos.map((e,i) => {
      const x = elos.length>1 ? (i/(elos.length-1))*W : W/2;
      const y = H - ((e-min)/(max-min))*H;
      const d = history[i].delta;
      const c = d>0 ? '#48c78e' : d<0 ? '#ff7675' : '#aaa';
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${c}"/>`;
    }).join('')}
    <text x="2" y="${H+15}" font-size="9" fill="rgba(255,255,255,0.4)">${elos[0]}</text>
    <text x="${W-2}" y="${H+15}" font-size="9" fill="rgba(255,255,255,0.4)" text-anchor="end">${elos[elos.length-1]}</text>
  </svg>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px">
    ${history.map(h => {
      const c = h.delta>0?'#48c78e':h.delta<0?'#ff7675':'#aaa';
      return `<span style="color:${c}">${h.delta>0?'+':''}${h.delta} </span>`;
    }).join('')}
  </div>`;
}

function nextEloNeeded(elo) {
  for (let i = 0; i < ALL_RANKS.length; i++) {
    if (ALL_RANKS[i].min > elo) return ALL_RANKS[i].min - elo;
  }
  return 0;
}

function renderBars(byMode) {
  const keys = Object.keys(byMode);
  if (!keys.length) return `<p class="muted">Chưa có dữ liệu</p>`;
  return keys.map(k => {
    const m = byMode[k]; const total = m.g||1;
    const wp=m.w/total*100, lp=m.l/total*100, dp=m.d/total*100;
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
    const m = byVariant[v]; if (!m.g) continue;
    const wp=m.w/m.g*100, lp=m.l/m.g*100, dp=m.d/m.g*100;
    out.push(`<div class="prof-row">
      <div class="prof-row-l">${v==='blind'?'🎴 Cờ Úp':'♟ Cờ Ngửa'}</div>
      <div class="bar"><div class="b-w" style="width:${wp}%"></div><div class="b-l" style="width:${lp}%"></div><div class="b-d" style="width:${dp}%"></div></div>
      <div class="prof-row-r muted small">${m.w}W ${m.l}L ${m.d}D</div>
    </div>`);
  }
  return out.join('') || `<p class="muted">Chưa có dữ liệu</p>`;
}

function renderRecent(games) {
  if (!games.length) return `<p class="muted">Chưa có ván nào</p>`;
  return `<div class="recent-grid">${games.map(g => {
    const us = g.userSide||'r';
    let r='D', cls='r-draw';
    if ((g.result==='1-0'&&us==='r')||(g.result==='0-1'&&us==='b')) { r='W'; cls='r-win'; }
    else if ((g.result==='0-1'&&us==='r')||(g.result==='1-0'&&us==='b')) { r='L'; cls='r-loss'; }
    const opp = g.mode==='bot' ? `Bot Lv${g.botLevel}` : g.mode;
    const dHtml = g.eloDelta!=null
      ? `<div style="font-size:10px;color:${g.eloDelta>0?'#48c78e':g.eloDelta<0?'#ff7675':'#aaa'}">${g.eloDelta>0?'+':''}${g.eloDelta}</div>`
      : '';
    return `<a class="recent-tile" href="#/replay/${g.id}">
      <div class="result-pill ${cls}">${r}</div>
      <div class="t">${esc(opp)}</div>
      ${dHtml}
      <div class="muted small">${esc(new Date(g.playedAt).toLocaleDateString())}</div>
    </a>`;
  }).join('')}</div>`;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
