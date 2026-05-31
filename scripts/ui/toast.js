// Cờ Tướng Vương — toast & confirm utility
let host = null;

function ensureHost() {
  if (host) return host;
  host = document.createElement('div');
  host.id = 'xq-toast-host';
  document.body.appendChild(host);
  return host;
}

export function toast(msg, opts = {}) {
  const h = ensureHost();
  const el = document.createElement('div');
  el.className = `xq-toast ${opts.type || 'info'}`;
  el.textContent = msg;
  h.appendChild(el);
  // Animate in
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, opts.duration || 2400);
}

/** Promise-based confirm dialog. Resolve true/false. */
export function confirm({ title, body, okText = 'OK', cancelText = 'Huỷ' }) {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'xq-modal-backdrop';
    back.innerHTML = `
      <div class="xq-modal" role="dialog" aria-modal="true">
        <div class="xq-modal-head">
          <h3>${escape(title || '')}</h3>
        </div>
        <div class="xq-modal-body">${body || ''}</div>
        <div class="xq-modal-foot">
          <button class="btn btn-ghost" data-act="cancel">${escape(cancelText)}</button>
          <button class="btn btn-primary" data-act="ok">${escape(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    const close = (val) => { back.remove(); resolve(val); };
    back.querySelector('[data-act="ok"]').addEventListener('click', () => close(true));
    back.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
    back.addEventListener('click', e => { if (e.target === back) close(false); });
  });
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
