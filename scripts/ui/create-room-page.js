// Cờ Tướng Vương — Create Room (UI stub, online cần backend)
import { t } from '../i18n/i18n.js';
import { toast } from './toast.js';

const TIME_PRESETS = [
  { id: '1+0',   label: '⚡ Bullet 1+0',   initial: 60_000,    inc: 0 },
  { id: '3+2',   label: '🔥 Blitz 3+2',    initial: 180_000,   inc: 2_000 },
  { id: '5+0',   label: '🔥 Blitz 5+0',    initial: 300_000,   inc: 0 },
  { id: '10+5',  label: '🎯 Rapid 10+5',   initial: 600_000,   inc: 5_000 },
  { id: '15+10', label: '🎯 Rapid 15+10',  initial: 900_000,   inc: 10_000 },
  { id: '30+30', label: '♟ Classical 30+30', initial: 1_800_000, inc: 30_000 },
  { id: 'inf',   label: '♾ ' + t('time.no_clock'), initial: 0, inc: 0 },
];
const TTL_OPTS = [15, 30, 60, 180, 720, 1440];

export function renderCreateRoomPage(root) {
  const state = {
    timePreset: '10+5',
    variant: 'standard',
    side: 'r',
    password: '',
    ttl: 15,
    notes: '',
  };

  const update = () => {
    root.querySelector('#sumTime').textContent = state.timePreset;
    root.querySelector('#sumVariant').textContent = state.variant === 'blind' ? '🎴 ' + t('variant.blind') : '♟ ' + t('variant.standard');
    root.querySelector('#sumSide').textContent =
      state.side === 'r' ? '🔴 ' + t('side.red') :
      state.side === 'b' ? '🟢 ' + t('side.black') :
      '🎲 ' + t('side.random');
    const pwTxt = state.password.trim().length === 0 ? '🔓 ' + t('room.public') :
                  state.password.length < 4 ? '⚠ ' + t('room.pw_short') :
                  '🔐 ' + t('room.protected') + ` (${'•'.repeat(state.password.length)})`;
    root.querySelector('#sumPw').textContent = pwTxt;
    root.querySelector('#sumTTL').textContent = `${state.ttl} ${t('time.minutes')}`;
  };

  root.innerHTML = `
    <h1 class="page-h1">🔑 ${esc(t('create_room.title'))}</h1>
    <p class="page-sub">${esc(t('create_room.intro'))}</p>

    <div class="alert warn">
      ⚠️ ${esc(t('create_room.online_required'))}
    </div>

    <div class="cr-grid">
      <div class="cr-form">
        <h3 class="cr-h">⏱ ${esc(t('time.title'))}</h3>
        <div class="opt-grid four">
          ${TIME_PRESETS.map(p => `
            <button class="opt ${p.id === state.timePreset ? 'active' : ''}" data-time="${p.id}">${esc(p.label)}</button>
          `).join('')}
        </div>

        <h3 class="cr-h">♟ ${esc(t('variant.title'))}</h3>
        <div class="opt-grid">
          <button class="opt active" data-var="standard">♟ ${esc(t('variant.standard'))}</button>
          <button class="opt" data-var="blind">🎴 ${esc(t('variant.blind'))}</button>
        </div>

        <h3 class="cr-h">🎨 ${esc(t('room.side'))}</h3>
        <div class="opt-grid three">
          <button class="opt active" data-side="r">🔴 ${esc(t('ai.you_play_red'))}</button>
          <button class="opt" data-side="b">🟢 ${esc(t('ai.you_play_black'))}</button>
          <button class="opt" data-side="rand">🎲 ${esc(t('side.random'))}</button>
        </div>

        <h3 class="cr-h">🔒 ${esc(t('room.password'))} <small class="muted">${esc(t('room.password.optional'))}</small></h3>
        <input type="password" class="text-input" id="pwInput" placeholder="${esc(t('room.password.placeholder'))}">
        <div class="muted small" style="margin-top:6px">${esc(t('room.password.note'))}</div>

        <h3 class="cr-h">⏳ ${esc(t('room.ttl'))}</h3>
        <div class="opt-grid three">
          ${TTL_OPTS.map(m => `
            <button class="opt ${m === state.ttl ? 'active' : ''}" data-ttl="${m}">${m < 60 ? m + ' ' + t('time.minutes') : (m / 60) + ' ' + t('time.hours')}</button>
          `).join('')}
        </div>

        <h3 class="cr-h">📝 ${esc(t('room.notes'))} <small class="muted">${esc(t('common.optional'))}</small></h3>
        <textarea class="text-input" id="notesInput" placeholder="${esc(t('room.notes.placeholder'))}" maxlength="200"></textarea>
      </div>

      <div class="cr-summary">
        <h3 class="cr-h">📋 ${esc(t('room.summary'))}</h3>
        <div class="summary-card">
          <div class="row"><span>${esc(t('time.label'))}</span><span class="val" id="sumTime">10+5</span></div>
          <div class="row"><span>${esc(t('variant.label'))}</span><span class="val" id="sumVariant">♟ Cờ ngửa</span></div>
          <div class="row"><span>${esc(t('room.side'))}</span><span class="val" id="sumSide">🔴 Đỏ</span></div>
          <div class="row"><span>${esc(t('room.password'))}</span><span class="val" id="sumPw">🔓 Public</span></div>
          <div class="row"><span>${esc(t('room.ttl'))}</span><span class="val" id="sumTTL">15 phút</span></div>
          <div class="row"><span>ELO</span><span class="muted">${esc(t('common.no_count'))}</span></div>
        </div>
        <button class="btn btn-primary btn-lg" id="createBtn" style="width:100%; margin-top:14px">🔑 ${esc(t('create_room.create'))}</button>
        <div class="muted small" style="margin-top:8px; text-align:center">
          ${esc(t('create_room.cancel_anytime'))}
        </div>
      </div>
    </div>
  `;

  // wire choices
  root.querySelectorAll('[data-time]').forEach(b => b.addEventListener('click', () => {
    state.timePreset = b.dataset.time;
    root.querySelectorAll('[data-time]').forEach(x => x.classList.toggle('active', x === b));
    update();
  }));
  root.querySelectorAll('[data-var]').forEach(b => b.addEventListener('click', () => {
    state.variant = b.dataset.var;
    root.querySelectorAll('[data-var]').forEach(x => x.classList.toggle('active', x === b));
    update();
  }));
  root.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => {
    state.side = b.dataset.side;
    root.querySelectorAll('[data-side]').forEach(x => x.classList.toggle('active', x === b));
    update();
  }));
  root.querySelectorAll('[data-ttl]').forEach(b => b.addEventListener('click', () => {
    state.ttl = parseInt(b.dataset.ttl, 10);
    root.querySelectorAll('[data-ttl]').forEach(x => x.classList.toggle('active', x === b));
    update();
  }));
  root.querySelector('#pwInput').addEventListener('input', e => {
    state.password = e.target.value;
    update();
  });
  root.querySelector('#notesInput').addEventListener('input', e => {
    state.notes = e.target.value;
  });
  root.querySelector('#createBtn').addEventListener('click', () => {
    toast(t('create_room.online_required_short'), { type: 'warn', duration: 3500 });
  });

  update();
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
