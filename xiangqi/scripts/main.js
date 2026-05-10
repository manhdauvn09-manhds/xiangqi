// Cờ Tướng Vương — entry point + hash router
import * as theme from './theme/theme.js';
import * as i18n  from './i18n/i18n.js';
import { t } from './i18n/i18n.js';
import { openAIModal } from './ui/ai-modal.js';
import { openAuthModal } from './ui/auth-modal.js';
import { GameController } from './ui/game-controller.js';
import { getProfile, getSettings, setSettings, getGameSession, clearGameSession } from './storage/local.js';
import { getRank } from './elo/elo.js';
import { renderSettingsPage } from './ui/settings-page.js';
import { renderHistoryPage } from './ui/history-page.js';
import { renderReplayPage } from './ui/replay-page.js';
import { renderProfilePage } from './ui/profile-page.js';
import { renderDailyPage } from './ui/daily-page.js';
import { renderLeaderboardPage } from './ui/leaderboard-page.js';
import { renderCreateRoomPage } from './ui/create-room-page.js';
import { renderOnlinePage } from './ui/online-page.js';
import { renderTournamentPage } from './ui/tournament-page.js';
import { setEnabled as setSoundEnabled } from './sound/sound.js';
import { isAuthed, getUser, onAuthChange, logout, loadMe } from './net/api.js';
import { toast } from './ui/toast.js';

let currentGame = null;

function boot() {
  theme.init();
  i18n.init();
  i18n.applyToDocument();

  const s = getSettings();
  setSoundEnabled(s.sound !== false);

  bindTopbar();
  document.addEventListener('xq:new-game', () => routeTo('#/play'));
  document.addEventListener('xq:home',     () => routeTo('#/home'));

  window.addEventListener('hashchange', applyRoute);

  // Refresh user info nếu có token (xác minh còn valid)
  if (isAuthed()) loadMe().then(() => syncUserChip()).catch(() => syncUserChip());
  onAuthChange(() => syncUserChip());

  applyRoute();
}

function bindTopbar() {
  document.getElementById('themeToggle')?.addEventListener('click', () => theme.toggle());
  document.querySelectorAll('[data-lang-set]').forEach(b => {
    b.addEventListener('click', () => i18n.setLang(b.dataset.langSet));
  });
  syncLangToggle();
  syncUserChip();
  i18n.onChange(() => {
    syncLangToggle();
    syncUserChip();
    i18n.applyToDocument();
  });
  syncNavActive();
  window.addEventListener('hashchange', syncNavActive);

  document.addEventListener('click', e => {
    const menu = document.getElementById('userMenu');
    if (menu && !menu.contains(e.target) && !document.getElementById('userChip')?.contains(e.target)) {
      menu.remove();
    }
  });

  // Sync resume button visibility
  syncResumeButton();
  window.addEventListener('hashchange', syncResumeButton);
  i18n.onChange(() => syncResumeButton());
}

function syncUserChip() {
  const slot = document.getElementById('userChipSlot');
  if (!slot) return;
  const user = getUser();
  if (user) {
    const initials = (user.displayName || 'U').slice(0, 2).toUpperCase();
    slot.innerHTML = `
      <button class="xq-userchip" id="userChip" type="button">
        <span class="av">${escape(initials)}</span>
        <span class="name">${escape(user.displayName)}</span>
      </button>
    `;
    document.getElementById('userChip').addEventListener('click', toggleUserMenu);
  } else {
    slot.innerHTML = `<button class="btn btn-sm" id="signinBtn">🔓 ${escape(t('topbar.signin'))}</button>`;
    document.getElementById('signinBtn').addEventListener('click', async () => {
      await openAuthModal('login');
    });
  }
}

function toggleUserMenu() {
  let menu = document.getElementById('userMenu');
  if (menu) { menu.remove(); return; }
  const chip = document.getElementById('userChip');
  if (!chip) return;
  const r = chip.getBoundingClientRect();
  menu = document.createElement('div');
  menu.id = 'userMenu';
  menu.className = 'user-menu';
  menu.style.top = (r.bottom + 6) + 'px';
  menu.style.right = (window.innerWidth - r.right) + 'px';
  menu.innerHTML = `
    <a href="#/profile">👤 ${escape(t('topbar.profile'))}</a>
    <a href="#/settings">⚙️ ${escape(t('nav.settings'))}</a>
    <hr>
    <button class="danger" data-act="logout">🚪 ${escape(t('topbar.signout'))}</button>
  `;
  document.body.appendChild(menu);
  menu.querySelector('[data-act="logout"]').addEventListener('click', async () => {
    await logout();
    menu.remove();
    toast('Đã đăng xuất');
    if (location.hash === '#/online') location.hash = '#/home';
  });
  // Close on link click
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.remove()));
}

function syncLangToggle() {
  const cur = i18n.getLang();
  document.querySelectorAll('[data-lang-set]').forEach(x =>
    x.classList.toggle('active', x.dataset.langSet === cur)
  );
}

function syncNavActive() {
  const hash = location.hash || '#/home';
  document.querySelectorAll('.xq-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', hash === href || (href !== '#/home' && hash.startsWith(href)));
  });
}

// Resume game button (persistent sessions)
function syncResumeButton() {
  const session = getGameSession();
  const topbar = document.querySelector('.xq-topbar');
  let resumeBtn = document.getElementById('resumeGameBtn');

  if (session && !location.hash.startsWith('#/play')) {
    // Show resume button
    if (!resumeBtn && topbar) {
      resumeBtn = document.createElement('button');
      resumeBtn.id = 'resumeGameBtn';
      resumeBtn.className = 'btn btn-primary';
      resumeBtn.innerHTML = '▶️ ' + t('btn.resume_game');
      resumeBtn.style.marginLeft = 'auto';
      resumeBtn.addEventListener('click', resumeGameSession);
      topbar.appendChild(resumeBtn);
    } else if (resumeBtn) {
      resumeBtn.innerHTML = '▶️ ' + t('btn.resume_game');
    }
  } else {
    // Hide resume button
    if (resumeBtn) resumeBtn.remove();
  }
}

function resumeGameSession() {
  const session = getGameSession();
  if (!session) return;

  // Navigate to play page with resume flag
  location.hash = '#/play?resume=true';
}

// ─────────────── Routing ───────────────
function applyRoute() {
  const hash = location.hash || '#/home';
  destroyCurrentGame();
  const root = document.getElementById('app');
  if (!root) return;

  if (hash === '#/home' || hash === '#/' || hash === '') return renderHome(root);
  if (hash.startsWith('#/online'))      return renderOnlinePage(root);
  if (hash.startsWith('#/play'))        return renderPlay(root);
  if (hash.startsWith('#/settings'))    return renderSettingsPage(root);
  if (hash.startsWith('#/history'))     return renderHistoryPage(root);
  if (hash.startsWith('#/replay/'))     return renderReplayPage(root, hash.slice('#/replay/'.length));
  if (hash.startsWith('#/profile'))     return renderProfilePage(root);
  if (hash.startsWith('#/daily'))       return renderDailyPage(root);
  if (hash.startsWith('#/leaderboard')) return renderLeaderboardPage(root);
  if (hash.startsWith('#/create-room')) return renderCreateRoomPage(root);
  if (hash.startsWith('#/tournament'))  return renderTournamentPage(root);
  if (hash.startsWith('#/verify'))      return renderVerifyPage(root);
  if (hash.startsWith('#/reset-password')) return renderResetPasswordPage(root);

  renderHome(root); // fallback
}

function routeTo(hash) {
  if (location.hash === hash) applyRoute();
  else location.hash = hash;
}

// ─────────────── Home ───────────────
function renderHome(root) {
  const profile = getProfile();
  const rank = getRank(profile.elo);
  root.innerHTML = `
    <section class="xq-hero">
      <h1>${esc(t('app.title'))} <span class="grad">象棋</span></h1>
      <p>${esc(t('app.tagline'))}</p>
      <div class="xq-hero-actions">
        <a class="btn btn-primary btn-lg" href="#/online">🌐 ${esc(t('online.title'))}</a>
        <button class="btn btn-lg" id="ctaPlayBot">🤖 ${esc(t('mode.bot'))}</button>
        <button class="btn btn-lg" id="ctaPlayBotBlind">🎴 ${esc(t('variant.blind'))} (Bot)</button>
        <button class="btn btn-lg" id="ctaPlayLocal">👥 ${esc(t('mode.local'))}</button>
        <a class="btn btn-ghost btn-lg" href="#/daily">🎯 ${esc(t('mode.daily'))}</a>
      </div>
    </section>

    <section class="xq-modes">
      <a class="xq-mode" href="#/profile">
        <div class="ico">📊</div>
        <h3>ELO ${profile.elo} ${rank.icon}</h3>
        <p>${esc(t('rank.' + rank.name))} · ${profile.gamesPlayed} ${esc(t('stats.games_short'))} · ${profile.wins}W ${profile.losses}L ${profile.draws}D</p>
      </a>
      <a class="xq-mode" href="#/history">
        <div class="ico">📜</div>
        <h3>${esc(t('nav.history'))}</h3>
        <p>${esc(t('history.intro'))}</p>
      </a>
      <a class="xq-mode" href="#/leaderboard">
        <div class="ico">🏆</div>
        <h3>${esc(t('nav.leaderboard'))}</h3>
        <p>${esc(t('lb.rank_ladder'))}</p>
      </a>
      <a class="xq-mode" href="#/daily">
        <div class="ico">🎯</div>
        <h3>${esc(t('mode.daily'))}</h3>
        <p>${esc(t('daily.find_mate', { n: '?' }))}</p>
      </a>
      <a class="xq-mode" href="#/tournament">
        <div class="ico">🏆</div>
        <h3>${esc(t('nav.tournament'))}</h3>
        <p>${esc(t('tournament.intro'))}</p>
      </a>
      <a class="xq-mode" href="#/create-room">
        <div class="ico">🔑</div>
        <h3>${esc(t('nav.create_room'))}</h3>
        <p>${esc(t('create_room.intro'))}</p>
      </a>
      <a class="xq-mode" href="#/settings">
        <div class="ico">⚙️</div>
        <h3>${esc(t('nav.settings'))}</h3>
        <p>${esc(t('settings.intro'))}</p>
      </a>
    </section>
  `;

  document.getElementById('ctaPlayBot')?.addEventListener('click', () => startBotGame('standard'));
  document.getElementById('ctaPlayBotBlind')?.addEventListener('click', () => startBotGame('blind'));
  document.getElementById('ctaPlayLocal')?.addEventListener('click', startLocalGame);
}

async function startBotGame(variant = 'standard') {
  const settings = getSettings();
  const cfg = await openAIModal({ level: settings.lastBotLevel, side: settings.lastSide, variant });
  if (!cfg) return;
  setSettings({ ...settings, lastBotLevel: cfg.level, lastSide: cfg.side });
  sessionStorage.setItem('xq_pending_game', JSON.stringify({
    mode: 'bot', botLevel: cfg.level, userSide: cfg.side, variant,
  }));
  if (location.hash === '#/play') applyRoute();
  else location.hash = '#/play';
}

function startLocalGame() {
  sessionStorage.setItem('xq_pending_game', JSON.stringify({ mode: 'local', userSide: 'r', variant: 'standard' }));
  if (location.hash === '#/play') applyRoute();
  else location.hash = '#/play';
}

// ─────────────── Game view ───────────────
function renderPlay(root) {
  // Check if resuming a saved game
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const isResuming = params.get('resume') === 'true';

  let cfg;
  if (isResuming) {
    const session = getGameSession();
    if (!session) { routeTo('#/home'); return; }
    // Reconstruct config from session
    cfg = {
      mode: session.mode,
      variant: session.variant,
      userSide: session.userSide,
      botLevel: session.botLevel,
      resumedFromSession: true,
      fen: session.fen,
      moves: session.moves,
      iccsHistory: session.iccsHistory,
      blindSeed: session.blindSeed,
    };
  } else {
    try { cfg = JSON.parse(sessionStorage.getItem('xq_pending_game') || 'null'); } catch {}
    if (!cfg) { routeTo('#/home'); return; }
  }

  const profile = getProfile();
  const settings = getSettings();
  const isBlind = cfg.variant === 'blind';
  const isOnline = cfg.mode === 'online';

  root.innerHTML = `
    <div class="xq-game">
      <div class="xq-side">
        <div class="xq-player ${cfg.userSide==='b'?'red':''}">
          <div class="av">${isOnline ? esc((cfg.opponent?.displayName || '?').slice(0,2).toUpperCase()) : '🤖'}</div>
          <div>
            <div class="name" id="opNameRed">${isOnline ? esc(cfg.opponent?.displayName || '?') : `🤖 Bot Lv ${cfg.botLevel || '—'}`}</div>
            <div class="meta">${isOnline ? esc(t('online.title')) + ' · ' + esc(cfg.time || '10+5') : (cfg.mode==='bot' ? '~' + (cfg.botLevel ? [600,800,1000,1200,1400,1600,1800,2000,2200,2400][cfg.botLevel-1] : 1000) + ' ELO' : '')}</div>
          </div>
        </div>
        <div class="xq-status" id="xqStatus">…</div>
        <div class="xq-actions">
          <button class="btn btn-sm" id="btnHint" title="${esc(t('btn.hint'))}">💡 ${esc(t('btn.hint'))}</button>
          <button class="btn btn-sm" id="btnTakeback" title="${esc(t('btn.takeback'))}">↺ ${esc(t('btn.takeback.short'))}</button>
          <button class="btn btn-sm" id="btnFlip">🔁 ${esc(t('btn.flip'))}</button>
          <button class="btn btn-sm" id="btnNew">🆕 ${esc(t('btn.new_game'))}</button>
          <button class="btn btn-sm btn-danger" id="btnResign">🚩 ${esc(t('btn.resign'))}</button>
          <button class="btn btn-sm btn-ghost" id="btnBackHome">🏠 ${esc(t('btn.back_home'))}</button>
        </div>
        ${isBlind ? `<div class="alert warn" style="margin:0;font-size:12px;padding:8px 10px">🎴 ${esc(t('variant.blind'))} — ${esc('chạm quân úp để lật, hoặc chọn quân đã lật để đi')}</div>` : ''}
        <div class="xq-player ${cfg.userSide==='r'?'red':''}">
          <div class="av">${esc((profile.name||'You').slice(0,2).toUpperCase())}</div>
          <div>
            <div class="name" id="opNameBlack">${esc(profile.name || t('side.you'))}</div>
            <div class="meta">ELO ${profile.elo}</div>
          </div>
        </div>
      </div>
      <div class="xq-board-stage">
        <div class="xq-board-wrap" id="xqBoardHost"></div>
      </div>
      <div class="xq-moves" id="xqMovesPanel">
        <div class="head">${esc(t('log.title'))}</div>
        <div id="xqMovesBody"><div class="empty">${esc(t('log.empty'))}</div></div>
      </div>
    </div>
  `;

  currentGame = new GameController(
    {
      boardHost: document.getElementById('xqBoardHost'),
      statusEl: document.getElementById('xqStatus'),
      movesEl: document.getElementById('xqMovesBody'),
      redInfoEl:   cfg.userSide==='r' ? document.getElementById('opNameBlack') : document.getElementById('opNameRed'),
      blackInfoEl: cfg.userSide==='b' ? document.getElementById('opNameBlack') : document.getElementById('opNameRed'),
      btnResign: document.getElementById('btnResign'),
      btnFlip: document.getElementById('btnFlip'),
      btnNew: document.getElementById('btnNew'),
      btnHint: document.getElementById('btnHint'),
      btnTakeback: document.getElementById('btnTakeback'),
      btnBackHome: document.getElementById('btnBackHome'),
    },
    cfg
  );
}

function destroyCurrentGame() {
  if (currentGame) {
    currentGame.destroy();
    currentGame = null;
  }
}

// ─────────────── Email Verify Page ───────────────
function renderVerifyPage(root) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const token = params.get('token');
  if (!token) {
    root.innerHTML = `<div class="empty-state"><div class="big-ico">❌</div><h2>${esc(t('verify.no_token'))}</h2></div>`;
    return;
  }
  root.innerHTML = `<div class="empty-state"><div class="big-ico">⏳</div><h2>${esc(t('verify.verifying'))}</h2></div>`;
  const API_BASE = document.querySelector('meta[name="xq-api-base"]')?.content || 'http://127.0.0.1:8787';
  fetch(`${API_BASE}/api/auth/verify-email/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        root.innerHTML = `<div class="empty-state"><div class="big-ico">✅</div><h2>${esc(t('verify.success'))}</h2><a class="btn btn-primary" href="#/home">${esc(t('btn.home'))}</a></div>`;
      } else {
        root.innerHTML = `<div class="empty-state"><div class="big-ico">❌</div><h2>${esc(t('verify.failed'))}</h2></div>`;
      }
    })
    .catch(() => {
      root.innerHTML = `<div class="empty-state"><div class="big-ico">❌</div><h2>${esc(t('verify.failed'))}</h2></div>`;
    });
}

// ─────────────── Password Reset Page ───────────────
function renderResetPasswordPage(root) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const token = params.get('token');
  if (!token) {
    // Show forgot password form
    root.innerHTML = `
      <div class="auth-page">
        <h1 class="page-h1">🔑 ${esc(t('reset.title'))}</h1>
        <div class="auth-card">
          <p>${esc(t('reset.enter_email'))}</p>
          <input type="email" id="resetEmail" class="input" placeholder="email@example.com">
          <button class="btn btn-primary" id="resetSend" style="margin-top:12px;width:100%">${esc(t('reset.send_link'))}</button>
          <div id="resetMsg" style="margin-top:12px"></div>
        </div>
      </div>
    `;
    const API_BASE = document.querySelector('meta[name="xq-api-base"]')?.content || 'http://127.0.0.1:8787';
    document.getElementById('resetSend').addEventListener('click', async () => {
      const email = document.getElementById('resetEmail').value.trim();
      if (!email) return;
      try {
        await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        document.getElementById('resetMsg').innerHTML = `<div class="alert ok">${esc(t('reset.sent'))}</div>`;
      } catch { document.getElementById('resetMsg').innerHTML = `<div class="alert warn">${esc(t('reset.error'))}</div>`; }
    });
    return;
  }
  // Show new password form
  root.innerHTML = `
    <div class="auth-page">
      <h1 class="page-h1">🔑 ${esc(t('reset.new_password'))}</h1>
      <div class="auth-card">
        <input type="password" id="newPw" class="input" placeholder="${esc(t('reset.new_password_placeholder'))}" minlength="6">
        <input type="password" id="newPw2" class="input" placeholder="${esc(t('reset.confirm_password'))}" minlength="6" style="margin-top:8px">
        <button class="btn btn-primary" id="resetConfirm" style="margin-top:12px;width:100%">${esc(t('reset.reset_btn'))}</button>
        <div id="resetMsg" style="margin-top:12px"></div>
      </div>
    </div>
  `;
  const API_BASE = document.querySelector('meta[name="xq-api-base"]')?.content || 'http://127.0.0.1:8787';
  document.getElementById('resetConfirm').addEventListener('click', async () => {
    const pw = document.getElementById('newPw').value;
    const pw2 = document.getElementById('newPw2').value;
    if (pw.length < 6) { document.getElementById('resetMsg').innerHTML = `<div class="alert warn">${esc(t('reset.too_short'))}</div>`; return; }
    if (pw !== pw2) { document.getElementById('resetMsg').innerHTML = `<div class="alert warn">${esc(t('reset.mismatch'))}</div>`; return; }
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: pw }),
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('resetMsg').innerHTML = `<div class="alert ok">${esc(t('reset.success'))}</div>`;
        setTimeout(() => location.hash = '#/home', 2000);
      } else {
        document.getElementById('resetMsg').innerHTML = `<div class="alert warn">${esc(data.message || t('reset.error'))}</div>`;
      }
    } catch { document.getElementById('resetMsg').innerHTML = `<div class="alert warn">${esc(t('reset.error'))}</div>`; }
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
const escape = esc;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
