// Cờ Tướng Vương — Auth modal (login + register tabs + Google Sign In)
import { t } from '../i18n/i18n.js';
import { register as apiRegister, login as apiLogin, googleSignIn as apiGoogleSignIn, getGoogleClientId } from '../net/api.js';
import { toast } from './toast.js';

let GOOGLE_CLIENT_ID = null; // Fetched from backend at runtime

// Global callback for Google Sign In (must be accessible to Google SDK)
window.handleGoogleSignInResponse = async function(response) {
  try {
    if (!response.credential) {
      toast(t('auth.err.google_failed'), { type: 'error' });
      return;
    }
    // Send token to backend
    const result = await apiGoogleSignIn({ idToken: response.credential });

    // Close modal and resolve
    const back = document.querySelector('.xq-modal-backdrop');
    if (back) back.remove();

    toast(t('auth.welcome'), { type: 'success' });
    window.location.hash = '#/home';
  } catch (err) {
    console.error('Google sign in error:', err);
    let msg = t('auth.err.unknown');
    if (err.message) msg = err.message;

    const errBox = document.querySelector('.auth-err');
    if (errBox) errBox.textContent = msg;
    toast(msg, { type: 'error' });
  }
};

export function openAuthModal(initialTab = 'login') {
  return new Promise(async (resolve) => {
    let tab = initialTab;
    let busy = false;

    // Fetch Google Client ID from backend if not already loaded
    if (!GOOGLE_CLIENT_ID) {
      try {
        GOOGLE_CLIENT_ID = await getGoogleClientId();
      } catch (err) {
        console.error('Failed to get Google Client ID:', err);
        toast(t('auth.err.config_failed'), { type: 'error' });
        return resolve(false);
      }
    }

    const back = document.createElement('div');
    back.className = 'xq-modal-backdrop';
    document.body.appendChild(back);
    paint();

    function paint() {
      back.innerHTML = `
        <div class="xq-modal" role="dialog" aria-modal="true">
          <div class="xq-modal-head">
            <div class="auth-tabs">
              <button class="${tab==='login'?'active':''}" data-tab="login">${esc(t('auth.tab.login'))}</button>
              <button class="${tab==='register'?'active':''}" data-tab="register">${esc(t('auth.tab.register'))}</button>
            </div>
          </div>
          <div class="xq-modal-body">
            ${tab === 'login' ? renderLogin() : renderRegister()}
          </div>
        </div>`;

      back.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
        tab = b.dataset.tab;
        paint();
      }));

      // Google Sign In button — render with Google SDK
      const googleBtn = back.querySelector('#googleSignIn');
      if (googleBtn && window.google?.accounts?.id) {
        // Use renderButton instead of onclick
        window.google.accounts.id.renderButton(
          googleBtn,
          {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            locale: 'en'
          }
        );
      }

      back.querySelector('form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy) return;
        busy = true;
        const f = e.target;
        const errBox = back.querySelector('.auth-err');
        errBox.textContent = '';
        try {
          if (tab === 'login') {
            await apiLogin({ email: f.email.value.trim(), password: f.password.value });
          } else {
            const dn = f.displayName.value.trim();
            if (dn.length < 1) throw new Error(t('auth.err.name_short'));
            await apiRegister({
              email: f.email.value.trim(),
              password: f.password.value,
              displayName: dn,
            });
          }
          back.remove();
          toast(t('auth.welcome'), { type: 'success' });
          resolve(true);
        } catch (err) {
          let msg = t('auth.err.unknown');
          if (err.status === 401 || err.data?.detail === 'bad_credentials') msg = t('auth.err.bad_creds');
          else if (err.data?.detail === 'email_taken') msg = t('auth.err.email_taken');
          else if (err.data?.detail === 'bad_email') msg = t('auth.err.bad_email');
          else if (err.message) msg = err.message;
          errBox.textContent = msg;
        } finally {
          busy = false;
        }
      });

      back.addEventListener('click', e => {
        if (e.target === back) { back.remove(); resolve(false); }
      });
    }
  });
}

function renderLogin() {
  return `
    <h3 style="margin-bottom:6px">🔓 ${esc(t('auth.login.title'))}</h3>
    <p class="muted small" style="margin-bottom:14px">${esc(t('auth.login.sub'))}</p>
    <button class="btn-google" id="googleSignIn">
      <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      ${esc(t('auth.google'))}
    </button>
    <div class="auth-divider">${esc(t('auth.or'))}</div>
    <form>
      <div class="field">
        <label>${esc(t('auth.email'))}</label>
        <input class="text-input" name="email" type="email" required autofocus placeholder="you@example.com">
      </div>
      <div class="field">
        <label>${esc(t('auth.password'))}</label>
        <input class="text-input" name="password" type="password" required minlength="6" placeholder="••••••">
      </div>
      <div class="auth-err"></div>
      <button class="btn btn-primary" style="width:100%; margin-top:8px">${esc(t('auth.login.btn'))}</button>
      <div style="text-align:center;margin-top:10px">
        <a href="#/reset-password" class="muted small" style="text-decoration:underline">${esc(t('auth.forgot'))}</a>
      </div>
    </form>
  `;
}

function renderRegister() {
  return `
    <h3 style="margin-bottom:6px">✨ ${esc(t('auth.register.title'))}</h3>
    <p class="muted small" style="margin-bottom:14px">${esc(t('auth.register.sub'))}</p>
    <button class="btn-google" id="googleSignIn">
      <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      ${esc(t('auth.google'))}
    </button>
    <div class="auth-divider">${esc(t('auth.or'))}</div>
    <form>
      <div class="field">
        <label>${esc(t('auth.email'))}</label>
        <input class="text-input" name="email" type="email" required autofocus placeholder="you@example.com">
      </div>
      <div class="field">
        <label>${esc(t('auth.display_name'))}</label>
        <input class="text-input" name="displayName" type="text" required maxlength="24" placeholder="Tên hiển thị">
      </div>
      <div class="field">
        <label>${esc(t('auth.password'))} <small class="muted">${esc(t('auth.password.hint'))}</small></label>
        <input class="text-input" name="password" type="password" required minlength="6" placeholder="••••••">
      </div>
      <div class="auth-err"></div>
      <button class="btn btn-primary" style="width:100%; margin-top:8px">${esc(t('auth.register.btn'))}</button>
    </form>
  `;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
