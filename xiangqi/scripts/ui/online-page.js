// Cờ Tướng Vương — Online play (Quick Play matchmaking)
import { t } from '../i18n/i18n.js';
import { isAuthed, getUser } from '../net/api.js';
import * as ws from '../net/ws-client.js';
import { openAuthModal } from './auth-modal.js';
import { toast } from './toast.js';

const TIME_OPTIONS = [
  { id: '3+2',  label: '🔥 Blitz 3+2' },
  { id: '5+0',  label: '🔥 Blitz 5+0' },
  { id: '10+5', label: '🎯 Rapid 10+5' },
  { id: '15+10','label': '🎯 Rapid 15+10' },
];

export async function renderOnlinePage(root) {
  if (!isAuthed()) {
    root.innerHTML = `
      <div class="online-page">
        <div class="ico" style="font-size:64px">🔐</div>
        <h1>${esc(t('online.title'))}</h1>
        <p>${esc(t('online.requires_login'))}</p>
        <button class="btn btn-primary btn-lg" id="signinNow">🔓 ${esc(t('auth.signin'))}</button>
      </div>`;
    root.querySelector('#signinNow').addEventListener('click', async () => {
      const ok = await openAuthModal('login');
      if (ok) renderOnlinePage(root);
    });
    return;
  }

  const user = getUser();

  let selectedTime = '10+5';
  let selectedVariant = 'standard';
  let inQueue = false;

  function paint() {
    root.innerHTML = `
      <div class="online-page">
        <h1>🌐 ${esc(t('online.title'))}</h1>
        <p>${esc(t('online.welcome_user', { name: user?.displayName || 'You' }))}</p>
        <span class="connection-badge ${ws.isConnected() ? 'online' : 'offline'}" id="connBadge">
          ${ws.isConnected() ? 'CONNECTED' : 'OFFLINE'}
        </span>

        ${inQueue ? renderQueue() : renderModeSelect()}
      </div>
    `;

    if (!inQueue) {
      root.querySelectorAll('[data-time]').forEach(b => b.addEventListener('click', () => {
        selectedTime = b.dataset.time;
        root.querySelectorAll('[data-time]').forEach(x => x.classList.toggle('active', x === b));
      }));
      root.querySelectorAll('[data-variant]').forEach(b => b.addEventListener('click', () => {
        selectedVariant = b.dataset.variant;
        root.querySelectorAll('[data-variant]').forEach(x => x.classList.toggle('active', x === b));
      }));
      root.querySelector('#findBtn')?.addEventListener('click', startQueue);
    } else {
      root.querySelector('#cancelBtn')?.addEventListener('click', cancelQueue);
    }
  }

  function renderModeSelect() {
    return `
      <div style="margin-top:20px; text-align:left">
        <h3 style="font-size:13px; color:var(--xq-text-mute); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px">${esc(t('time.title'))}</h3>
        <div class="online-modes">
          ${TIME_OPTIONS.map(o => `
            <button class="online-mode-btn ${o.id === selectedTime ? 'active' : ''}" data-time="${o.id}">
              <div class="nm">${esc(o.label)}</div>
            </button>
          `).join('')}
        </div>

        <h3 style="font-size:13px; color:var(--xq-text-mute); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px">${esc(t('variant.title'))}</h3>
        <div class="online-modes" style="grid-template-columns: 1fr 1fr">
          <button class="online-mode-btn ${selectedVariant === 'standard' ? 'active' : ''}" data-variant="standard">
            <div class="ico">♟</div>
            <div class="nm">${esc(t('variant.standard'))}</div>
          </button>
          <button class="online-mode-btn ${selectedVariant === 'blind' ? 'active' : ''}" data-variant="blind">
            <div class="ico">🎴</div>
            <div class="nm">${esc(t('variant.blind'))}</div>
          </button>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" id="findBtn" style="width:100%; margin-top: 24px">
        ⚡ ${esc(t('online.queue.find'))}
      </button>
    `;
  }

  function renderQueue() {
    return `
      <div class="queue-card">
        <div class="spinner"></div>
        <h2>${esc(t('online.queue.searching'))}</h2>
        <p class="muted small" id="queueInfo">${esc(t('online.connecting'))}</p>
        <button class="btn btn-ghost" id="cancelBtn" style="margin-top:14px">${esc(t('online.queue.cancel'))}</button>
      </div>
    `;
  }

  async function startQueue() {
    inQueue = true;
    paint();
    try {
      await ws.connect();
      // Listen for matchmaking
      const offMatched = ws.on('queue.matched', onMatched);
      const offJoined = ws.on('queue.joined', (m) => {
        const info = root.querySelector('#queueInfo');
        if (info) info.textContent = `Position ${m.position} in queue · ${selectedTime} · ${selectedVariant}`;
      });
      ws.send('queue.join', { variant: selectedVariant, time: selectedTime });
      // Cleanup if user navigates away
      window.addEventListener('hashchange', () => {
        offMatched(); offJoined();
        if (inQueue) ws.send('queue.leave');
      }, { once: true });
    } catch (e) {
      toast(t('auth.err.no_backend'), { type: 'error', duration: 5000 });
      inQueue = false;
      paint();
    }
  }

  function cancelQueue() {
    if (ws.isConnected()) ws.send('queue.leave');
    inQueue = false;
    paint();
  }

  function onMatched(msg) {
    inQueue = false;
    // Lưu game info → redirect to /play với mode online
    sessionStorage.setItem('xq_pending_game', JSON.stringify({
      mode: 'online',
      gameId: msg.gameId,
      userSide: msg.side,
      variant: msg.variant,
      opponent: msg.opponent,
      time: selectedTime,
    }));
    location.hash = '#/play';
  }

  paint();

  // Auto-connect WS when entering page if logged in
  if (!ws.isConnected()) {
    ws.connect().then(() => {
      const badge = root.querySelector('#connBadge');
      if (badge) {
        badge.classList.replace('offline', 'online');
        badge.textContent = 'CONNECTED';
      }
    }).catch(() => {});
  }
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
