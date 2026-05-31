// Cờ Tướng Vương — Settings page (full)
import { t, setLang, getLang } from '../i18n/i18n.js';
import * as theme from '../theme/theme.js';
import { getSettings, setSettings, getProfile, setProfile } from '../storage/local.js';
import { setEnabled as setSoundEnabled } from '../sound/sound.js';
import { toast, confirm } from './toast.js';

export function renderSettingsPage(root) {
  const s = getSettings();
  const p = getProfile();
  root.innerHTML = `
    <h1 class="page-h1">⚙️ ${esc(t('nav.settings'))}</h1>
    <p class="page-sub">${esc(t('settings.intro'))}</p>

    <section class="settings-grid">
      <div class="settings-card">
        <div class="sc-head"><h3>🎨 ${esc(t('set.display'))}</h3></div>
        <div class="sc-row">
          <div class="sc-label">${esc(t('set.theme'))}</div>
          <div class="opt-grid three">
            <button class="opt" data-theme-set="light">${esc(t('set.theme.light'))}</button>
            <button class="opt" data-theme-set="dark">${esc(t('set.theme.dark'))}</button>
            <button class="opt" data-theme-set="auto">${esc(t('set.theme.auto'))}</button>
          </div>
        </div>
        <div class="sc-row">
          <div class="sc-label">${esc(t('set.notation'))}</div>
          <div class="opt-grid">
            <button class="opt ${s.notation==='vn'?'active':''}" data-notation="vn">${esc(t('set.notation.vn'))}</button>
            <button class="opt ${s.notation==='iccs'?'active':''}" data-notation="iccs">${esc(t('set.notation.iccs'))}</button>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="sc-head"><h3>🌐 ${esc(t('set.language'))}</h3></div>
        <div class="sc-row">
          <div class="sc-label">${esc(t('set.lang'))}</div>
          <div class="opt-grid">
            <button class="opt" data-lang-set="vi">🇻🇳 Tiếng Việt</button>
            <button class="opt" data-lang-set="en">🇬🇧 English</button>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="sc-head"><h3>🔊 ${esc(t('set.audio'))}</h3></div>
        <div class="sc-row toggle">
          <div class="sc-label">
            <div>${esc(t('set.sound'))}</div>
            <small class="muted">${esc(t('set.sound.desc'))}</small>
          </div>
          <button class="switch ${s.sound?'on':''}" data-toggle="sound"></button>
        </div>
      </div>

      <div class="settings-card">
        <div class="sc-head"><h3>♟ ${esc(t('set.gameplay'))}</h3></div>
        <div class="sc-row toggle">
          <div class="sc-label">
            <div>${esc(t('set.hint'))}</div>
            <small class="muted">${esc(t('set.hint.desc'))}</small>
          </div>
          <button class="switch ${s.hint?'on':''}" data-toggle="hint"></button>
        </div>
        <div class="sc-row toggle">
          <div class="sc-label">
            <div>${esc(t('set.takeback'))}</div>
            <small class="muted">${esc(t('set.takeback.desc'))}</small>
          </div>
          <button class="switch ${s.takeback!==false?'on':''}" data-toggle="takeback"></button>
        </div>
      </div>

      <div class="settings-card">
        <div class="sc-head"><h3>👤 ${esc(t('set.profile'))}</h3></div>
        <div class="sc-row">
          <div class="sc-label">${esc(t('set.display_name'))}</div>
          <input class="text-input" id="setName" value="${esc(p.name || '')}" maxlength="24">
        </div>
        <div class="sc-row">
          <div class="sc-label">${esc(t('set.elo'))}</div>
          <div class="muted">${p.elo} · ${p.gamesPlayed} ${esc(t('stats.games_short'))}</div>
        </div>
      </div>

      <div class="settings-card danger">
        <div class="sc-head"><h3>🗑 ${esc(t('set.danger'))}</h3></div>
        <div class="sc-row toggle">
          <div class="sc-label">
            <div>${esc(t('set.reset_history'))}</div>
            <small class="muted">${esc(t('set.reset_history.desc'))}</small>
          </div>
          <button class="btn btn-sm btn-danger" id="resetHistory">${esc(t('btn.reset'))}</button>
        </div>
        <div class="sc-row toggle">
          <div class="sc-label">
            <div>${esc(t('set.reset_all'))}</div>
            <small class="muted">${esc(t('set.reset_all.desc'))}</small>
          </div>
          <button class="btn btn-sm btn-danger" id="resetAll">${esc(t('btn.reset_all'))}</button>
        </div>
      </div>
    </section>
  `;

  // Theme
  const curTheme = theme.get();
  root.querySelectorAll('[data-theme-set]').forEach(b => {
    if (b.dataset.themeSet === curTheme) b.classList.add('active');
    b.addEventListener('click', () => {
      theme.set(b.dataset.themeSet);
      root.querySelectorAll('[data-theme-set]').forEach(x => x.classList.toggle('active', x.dataset.themeSet === b.dataset.themeSet));
    });
  });

  // Lang
  const curLang = getLang();
  root.querySelectorAll('[data-lang-set]').forEach(b => {
    if (b.dataset.langSet === curLang) b.classList.add('active');
    b.addEventListener('click', () => setLang(b.dataset.langSet));
  });

  // Notation
  root.querySelectorAll('[data-notation]').forEach(b => {
    b.addEventListener('click', () => {
      const cur = getSettings();
      setSettings({ ...cur, notation: b.dataset.notation });
      root.querySelectorAll('[data-notation]').forEach(x => x.classList.toggle('active', x.dataset.notation === b.dataset.notation));
    });
  });

  // Toggles
  root.querySelectorAll('[data-toggle]').forEach(b => {
    b.addEventListener('click', () => {
      const key = b.dataset.toggle;
      const cur = getSettings();
      const next = !(cur[key] !== false ? cur[key] : true);
      setSettings({ ...cur, [key]: next });
      b.classList.toggle('on', next);
      if (key === 'sound') setSoundEnabled(next);
    });
  });

  // Display name
  const nameInput = root.querySelector('#setName');
  let nameTimer = null;
  nameInput?.addEventListener('input', () => {
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => {
      const cur = getProfile();
      setProfile({ ...cur, name: nameInput.value.trim() || 'Bạn' });
      toast(t('toast.saved'), { type: 'success' });
    }, 600);
  });

  // Reset
  root.querySelector('#resetHistory')?.addEventListener('click', async () => {
    if (await confirm({ title: t('set.reset_history'), body: `<p>${esc(t('set.reset_history.confirm'))}</p>`, okText: t('btn.confirm'), cancelText: t('btn.cancel') })) {
      localStorage.removeItem('xq_history');
      toast(t('toast.done'), { type: 'success' });
    }
  });
  root.querySelector('#resetAll')?.addEventListener('click', async () => {
    if (await confirm({ title: t('set.reset_all'), body: `<p>${esc(t('set.reset_all.confirm'))}</p>`, okText: t('btn.confirm'), cancelText: t('btn.cancel') })) {
      ['xq_history','xq_profile','xq_settings'].forEach(k => localStorage.removeItem(k));
      toast(t('toast.done'), { type: 'success' });
      setTimeout(() => location.reload(), 600);
    }
  });
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
