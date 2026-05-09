// Cờ Tướng Vương — AI setup modal
import { t } from '../i18n/i18n.js';

const ELO_BY_LV = [600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];

/**
 * Mở modal cấu hình AI.
 * @param defaults { level, side }
 * @returns Promise<{level, side, variant} | null>
 */
export function openAIModal(defaults = {}) {
  return new Promise(resolve => {
    let level = defaults.level || 3;
    let side  = defaults.side  || 'r';

    const back = document.createElement('div');
    back.className = 'xq-modal-backdrop';
    back.innerHTML = `
      <div class="xq-modal xq-ai-modal" role="dialog" aria-modal="true">
        <div class="xq-modal-head">
          <div>
            <h3>🤖 ${escapeHtml(t('mode.bot'))}</h3>
            <p class="muted small">Chọn cấp độ và bên đi</p>
          </div>
        </div>
        <div class="xq-modal-body">
          <div class="ai-preview">
            <div class="ai-lv-num" id="aiLvNum">3</div>
            <div>
              <div class="ai-lv-name" id="aiLvName">${escapeHtml(t('ai.lv3'))}</div>
              <div class="muted small" id="aiLvElo">~1000 ELO</div>
            </div>
          </div>
          <div class="field">
            <label data-i18n="ai.level">${escapeHtml(t('ai.level'))}</label>
            <input type="range" min="1" max="10" value="${level}" id="aiLvSlider" class="range">
            <div class="lv-marks">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
            </div>
          </div>
          <div class="field">
            <label>${escapeHtml(t('side.you'))}</label>
            <div class="opt-grid">
              <button class="opt ${side==='r'?'active':''}" data-side="r">
                <div class="ico" style="color:var(--xq-red)">🔴</div>
                <div>${escapeHtml(t('ai.you_play_red'))}</div>
              </button>
              <button class="opt ${side==='b'?'active':''}" data-side="b">
                <div class="ico" style="color:var(--xq-jade)">🟢</div>
                <div>${escapeHtml(t('ai.you_play_black'))}</div>
              </button>
            </div>
          </div>
        </div>
        <div class="xq-modal-foot">
          <button class="btn btn-ghost" data-act="cancel">${escapeHtml(t('btn.cancel'))}</button>
          <button class="btn btn-primary" data-act="ok">⚡ ${escapeHtml(t('ai.start'))}</button>
        </div>
      </div>`;
    document.body.appendChild(back);

    const slider = back.querySelector('#aiLvSlider');
    const numEl  = back.querySelector('#aiLvNum');
    const nameEl = back.querySelector('#aiLvName');
    const eloEl  = back.querySelector('#aiLvElo');

    function refresh() {
      numEl.textContent = level;
      nameEl.textContent = t(`ai.lv${level}`);
      eloEl.textContent  = `~${ELO_BY_LV[level-1]} ELO`;
    }
    slider.addEventListener('input', () => {
      level = parseInt(slider.value, 10);
      refresh();
    });
    refresh();

    back.querySelectorAll('.opt[data-side]').forEach(b => {
      b.addEventListener('click', () => {
        side = b.dataset.side;
        back.querySelectorAll('.opt[data-side]').forEach(x => x.classList.toggle('active', x === b));
      });
    });

    const close = (v) => { back.remove(); resolve(v); };
    back.querySelector('[data-act="cancel"]').addEventListener('click', () => close(null));
    back.querySelector('[data-act="ok"]').addEventListener('click', () => close({ level, side, variant: 'standard' }));
    back.addEventListener('click', e => { if (e.target === back) close(null); });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
