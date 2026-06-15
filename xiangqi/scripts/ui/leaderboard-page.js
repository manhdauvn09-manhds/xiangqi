// Cờ Tướng Vương — Leaderboard (live từ backend, tier filter, search, highlight user)
import { t } from '../i18n/i18n.js';
import { getProfile } from '../storage/local.js';
import { ALL_RANKS, getRank } from '../elo/elo.js';
import { ratings, getUser } from '../net/api.js';

export async function renderLeaderboardPage(root) {
  const me = getProfile();
  const myRank = getRank(me.elo);
  const currentUser = getUser();

  root.innerHTML = `
    <h1 class="page-h1">🏆 ${esc(t('nav.leaderboard'))}</h1>
    <div class="lb-loading" id="lbLoading" style="text-align:center;padding:40px">
      <div class="muted">Đang tải bảng xếp hạng…</div>
    </div>
    <div id="lbContent" style="display:none">
      <div class="lb-topbar" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <span class="lb-badge" id="lbBadge"></span>
        <div class="tier-tabs" id="tierTabs" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        <input class="lb-search" id="lbSearch" type="text" placeholder="🔍 Tìm tên…" autocomplete="off"
          style="margin-left:auto;padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.07);color:inherit;font-size:13px;min-width:150px">
      </div>
      <div id="lbSelf" style="margin-bottom:12px"></div>
      <div class="lb-table-wrap">
        <table class="lb-table" style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="font-size:12px;color:rgba(255,255,255,0.5);border-bottom:1px solid rgba(255,255,255,0.1)">
              <th style="padding:8px 4px;text-align:left;width:40px">#</th>
              <th style="padding:8px 4px;text-align:left">${esc(t('lb.player'))}</th>
              <th style="padding:8px 4px;text-align:right">ELO</th>
              <th style="padding:8px 4px;text-align:left">${esc(t('lb.rank'))}</th>
              <th style="padding:8px 4px;text-align:center;color:#48c78e">W</th>
              <th style="padding:8px 4px;text-align:center;color:#aaa">D</th>
              <th style="padding:8px 4px;text-align:center;color:#ff7675">L</th>
              <th style="padding:8px 4px;text-align:right">Win%</th>
            </tr>
          </thead>
          <tbody id="lbBody"></tbody>
        </table>
      </div>
      <div id="lbEmpty" style="display:none;text-align:center;padding:32px;color:rgba(255,255,255,0.4)">
        Không có người chơi nào khớp bộ lọc.
      </div>
    </div>
  `;

  let leaders = [];
  let isLive = false;

  try {
    const live = await ratings.leaderboard('standard', 100);
    if (Array.isArray(live) && live.length > 0) {
      leaders = live.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        name: r.display_name || r.displayName || '?',
        elo: r.elo,
        wins: r.wins ?? 0,
        losses: r.losses ?? 0,
        draws: r.draws ?? 0,
        gamesPlayed: r.games_played ?? 0,
      }));
      isLive = true;
    }
  } catch (_) {}

  root.querySelector('#lbLoading').style.display = 'none';
  root.querySelector('#lbContent').style.display = 'block';

  const badgeEl = root.querySelector('#lbBadge');
  badgeEl.textContent = isLive ? '🌐 LIVE' : '📴 Offline';
  badgeEl.style.cssText = `padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;
    background:${isLive ? 'rgba(72,199,142,0.2)' : 'rgba(255,255,255,0.08)'};
    color:${isLive ? '#48c78e' : 'rgba(255,255,255,0.4)'}`;

  // Tier filter tabs
  const TIERS = [
    { key: 'all', label: 'Tất cả', minElo: 0 },
    { key: 'cao_thu', label: '🛡️ Cao Thủ+', minElo: 2000 },
    { key: 'vang', label: '🥇 Vàng+', minElo: 1600 },
    { key: 'bac', label: '🥈 Bạc+', minElo: 1400 },
    { key: 'dong', label: '🟫 Đồng+', minElo: 1200 },
  ];
  let activeTier = 'all';
  const tabsEl = root.querySelector('#tierTabs');

  function buildTabs() {
    tabsEl.innerHTML = TIERS.map(tier =>
      `<button class="tier-tab" data-tier="${tier.key}" style="
        padding:5px 12px;border-radius:16px;border:1px solid rgba(255,255,255,0.15);
        background:${activeTier===tier.key?'#667eea':'rgba(255,255,255,0.06)'};
        color:${activeTier===tier.key?'#fff':'inherit'};cursor:pointer;font-size:12px;font-weight:600">
        ${esc(tier.label)}</button>`
    ).join('');
    tabsEl.querySelectorAll('.tier-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTier = btn.dataset.tier;
        buildTabs();
        paint();
      });
    });
  }
  buildTabs();

  // Vị trí user hiện tại
  const selfEl = root.querySelector('#lbSelf');
  const myName = currentUser?.displayName || me.name;
  const myEntry = isLive && myName ? leaders.find(l => l.name === myName) : null;

  if (myEntry) {
    const wr = myEntry.gamesPlayed > 0 ? Math.round(myEntry.wins / myEntry.gamesPlayed * 100) : 0;
    const rk = getRank(myEntry.elo);
    selfEl.innerHTML = `<div style="display:flex;align-items:center;gap:12px;background:rgba(102,126,234,0.12);
      border:1px solid rgba(102,126,234,0.3);border-radius:10px;padding:12px 16px;margin-bottom:8px">
      <div style="width:38px;height:38px;border-radius:50%;background:${rk.color};display:flex;align-items:center;
        justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${esc(myEntry.name.slice(0,2).toUpperCase())}</div>
      <div>
        <div style="font-weight:700">${esc(myEntry.name)} <span style="color:rgba(255,255,255,0.4);font-size:12px">#${myEntry.rank} toàn cầu</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,0.6)">${rk.icon} ${esc(t('rank.'+rk.name))} · ELO <strong>${myEntry.elo}</strong> · ${myEntry.wins}W ${myEntry.draws}D ${myEntry.losses}L · ${wr}% thắng</div>
      </div>
    </div>`;
  } else if (me.gamesPlayed > 0) {
    selfEl.innerHTML = `<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 16px;margin-bottom:8px">
      <div style="width:38px;height:38px;border-radius:50%;background:${myRank.color};display:flex;align-items:center;
        justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${esc((me.name||'?').slice(0,2).toUpperCase())}</div>
      <div>
        <div style="font-weight:700">${esc(me.name||'Bạn')} <span style="font-size:11px;color:rgba(255,255,255,0.4)">(chỉ local)</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,0.6)">${myRank.icon} ELO <strong>${me.elo}</strong> · ${me.wins}W ${me.draws}D ${me.losses}L</div>
      </div>
    </div>`;
  }

  if (!isLive) {
    root.querySelector('#lbSelf').insertAdjacentHTML('afterend',
      `<p class="muted small" style="margin-bottom:12px;text-align:center">
        Chưa kết nối server. <a href="#/online" style="color:#667eea">Đăng nhập</a> để vào BXH toàn cầu.
      </p>`);
  }

  function paint() {
    const search = (root.querySelector('#lbSearch')?.value || '').toLowerCase().trim();
    const tier = TIERS.find(t => t.key === activeTier);
    let list = leaders;
    if (tier && tier.minElo > 0) list = list.filter(l => l.elo >= tier.minElo);
    if (search) list = list.filter(l => l.name.toLowerCase().includes(search));

    const body = root.querySelector('#lbBody');
    const empty = root.querySelector('#lbEmpty');
    if (list.length === 0) { body.innerHTML = ''; empty.style.display = ''; return; }
    empty.style.display = 'none';

    body.innerHTML = list.map(l => {
      const r = getRank(l.elo);
      const topBg = l.rank===1 ? 'rgba(244,196,48,0.12)' : l.rank===2 ? 'rgba(192,192,192,0.1)' : l.rank===3 ? 'rgba(205,127,50,0.1)' : '';
      const podium = l.rank===1 ? '👑' : l.rank===2 ? '🥈' : l.rank===3 ? '🥉' : '';
      const isMe   = myName && l.name === myName;
      const wr     = l.gamesPlayed > 0 ? Math.round(l.wins / l.gamesPlayed * 100) : 0;
      const wrColor= wr >= 60 ? '#48c78e' : wr >= 40 ? '#f4c430' : '#ff7675';
      const rowStyle = isMe
        ? 'background:rgba(102,126,234,0.18);border-left:3px solid #667eea'
        : topBg ? `background:${topBg}` : '';
      return `<tr style="${rowStyle};border-bottom:1px solid rgba(255,255,255,0.05)">
        <td style="padding:9px 4px;font-weight:700">${l.rank} ${podium}</td>
        <td style="padding:9px 4px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:${r.color};display:flex;align-items:center;
              justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">${esc(l.name.slice(0,2).toUpperCase())}</div>
            <span style="font-size:13px">${esc(l.name)}${isMe?` <span style="background:#667eea;color:#fff;font-size:10px;padding:1px 5px;border-radius:8px;margin-left:4px">Bạn</span>`:''}</span>
          </div>
        </td>
        <td style="padding:9px 4px;text-align:right;font-weight:700">${l.elo}${l.gamesPlayed===0?` <span style="font-size:10px;color:rgba(255,255,255,0.35)">New</span>`:''}
        </td>
        <td style="padding:9px 4px"><span style="color:${r.color}">${r.icon} <span class="lb-rank-name" style="font-size:12px">${esc(t('rank.'+r.name))}</span></span></td>
        <td style="padding:9px 4px;text-align:center;color:#48c78e">${l.wins}</td>
        <td style="padding:9px 4px;text-align:center;color:rgba(255,255,255,0.5)">${l.draws}</td>
        <td style="padding:9px 4px;text-align:center;color:#ff7675">${l.losses}</td>
        <td style="padding:9px 4px;text-align:right"><span style="color:${wrColor};font-weight:600">${wr}%</span></td>
      </tr>`;
    }).join('');
  }

  root.querySelector('#lbSearch').addEventListener('input', paint);
  paint();
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
