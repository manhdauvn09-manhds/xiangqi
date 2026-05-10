// Cờ Tướng Vương — Unified Find Match modal (bot + online)
import { t } from '../i18n/i18n.js';

const ELO_BY_LV = [600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];
const TIME_OPTIONS = [
  { label: '3+2', value: '3+2', class: 'blitz' },
  { label: '5+0', value: '5+0', class: 'blitz' },
  { label: '10+5', value: '10+5', class: 'rapid' },
  { label: '15+10', value: '15+10', class: 'rapid' }
];

export function openFindMatchModal(initialTab = 'bot') {
  return new Promise((resolve) => {
    let tab = initialTab;
    let difficulty = 3;
    let side = 'r';
    let time = '10+5';
    let variant = 'standard';

    const back = document.createElement('div');
    back.className = 'xq-modal-backdrop';
    document.body.appendChild(back);
    paint();

    function paint() {
      back.innerHTML = `
        <div class="xq-modal xq-find-match-modal" role="dialog" aria-modal="true">
          <div class="xq-modal-head">
            <div class="find-match-tabs">
              <button class="${tab === 'bot' ? 'active' : ''}" data-tab="bot">🤖 ${esc(t('mode.bot'))}</button>
              <button class="${tab === 'online' ? 'active' : ''}" data-tab="online">🌐 ${esc(t('mode.online'))}</button>
            </div>
          </div>
          <div class="xq-modal-body">
            ${tab === 'bot' ? renderBotTab() : renderOnlineTab()}
          </div>
          <div class="xq-modal-foot">
            <button class="btn btn-ghost" data-act="cancel">${esc(t('btn.cancel'))}</button>
            <button class="btn btn-primary" data-act="start">⚡ ${esc(t('btn.start'))}</button>
          </div>
        </div>`;
      document.body.appendChild(back);

      // Tab switching
      back.querySelectorAll('[data-tab]').forEach((b) => {
        b.addEventListener('click', () => {
          tab = b.dataset.tab;
          paint();
        });
      });

      // Bot tab events
      if (tab === 'bot') {
        const slider = back.querySelector('#diffSlider');
        const numEl = back.querySelector('#diffNum');
        const nameEl = back.querySelector('#diffName');
        const eloEl = back.querySelector('#diffElo');

        function updateDiff() {
          numEl.textContent = difficulty;
          nameEl.textContent = t(`ai.lv${difficulty}`);
          eloEl.textContent = `~${ELO_BY_LV[difficulty - 1]} ELO`;
        }
        slider.addEventListener('input', () => {
          difficulty = parseInt(slider.value, 10);
          updateDiff();
        });
        updateDiff();

        back.querySelectorAll('.side-opt[data-side]').forEach((b) => {
          b.addEventListener('click', () => {
            side = b.dataset.side;
            back.querySelectorAll('.side-opt[data-side]').forEach((x) =>
              x.classList.toggle('active', x === b)
            );
          });
        });
      }

      // Online tab events
      if (tab === 'online') {
        back.querySelectorAll('.time-opt[data-time]').forEach((b) => {
          b.addEventListener('click', () => {
            time = b.dataset.time;
            back.querySelectorAll('.time-opt[data-time]').forEach((x) =>
              x.classList.toggle('active', x === b)
            );
          });
        });

        back.querySelectorAll('.variant-opt[data-variant]').forEach((b) => {
          b.addEventListener('click', () => {
            variant = b.dataset.variant;
            back.querySelectorAll('.variant-opt[data-variant]').forEach((x) =>
              x.classList.toggle('active', x === b)
            );
          });
        });
      }

      // Action buttons
      back.querySelector('[data-act="cancel"]').addEventListener('click', () => {
        back.remove();
        resolve(null);
      });

      back.querySelector('[data-act="start"]').addEventListener('click', () => {
        back.remove();
        if (tab === 'bot') {
          resolve({ mode: 'bot', difficulty, side, variant: 'standard' });
        } else {
          resolve({ mode: 'online', time, variant, side });
        }
      });

      // Close on backdrop click
      back.addEventListener('click', (e) => {
        if (e.target === back) {
          back.remove();
          resolve(null);
        }
      });
    }

    function renderBotTab() {
      return `
        <h3 style="margin-bottom:12px">${esc(t('mode.bot'))}</h3>
        <p class="muted small" style="margin-bottom:16px">Chọn cấp độ AI và bên chơi</p>

        <div class="diff-preview">
          <div class="diff-lv-num" id="diffNum">3</div>
          <div>
            <div class="diff-lv-name" id="diffName">${esc(t('ai.lv3'))}</div>
            <div class="muted small" id="diffElo">~1000 ELO</div>
          </div>
        </div>

        <div class="field" style="margin-top:16px">
          <label>${esc(t('ai.level'))}</label>
          <input type="range" min="1" max="10" value="3" id="diffSlider" class="range">
          <div class="lv-marks">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
          </div>
        </div>

        <div class="field" style="margin-top:16px">
          <label>${esc(t('side.you'))}</label>
          <div class="side-grid">
            <button class="side-opt active" data-side="r">
              <div class="ico" style="color:var(--xq-red)">🔴</div>
              <div>${esc(t('ai.you_play_red'))}</div>
            </button>
            <button class="side-opt" data-side="b">
              <div class="ico" style="color:var(--xq-jade)">🟢</div>
              <div>${esc(t('ai.you_play_black'))}</div>
            </button>
          </div>
        </div>
      `;
    }

    function renderOnlineTab() {
      return `
        <h3 style="margin-bottom:12px">${esc(t('mode.online'))}</h3>
        <p class="muted small" style="margin-bottom:16px">Chọn thời gian và kiểu chơi</p>

        <div class="field">
          <label>Time Control</label>
          <div class="time-grid">
            ${TIME_OPTIONS.map(
              (opt) => `
              <button class="time-opt ${opt.value === '10+5' ? 'active' : ''}" data-time="${opt.value}">
                ${esc(opt.label)}
              </button>
            `
            ).join('')}
          </div>
        </div>

        <div class="field" style="margin-top:16px">
          <label>${esc(t('variant.title'))}</label>
          <div class="variant-grid">
            <button class="variant-opt active" data-variant="standard">
              <div class="ico">♚</div>
              <div>${esc(t('variant.standard'))}</div>
            </button>
            <button class="variant-opt" data-variant="blind">
              <div class="ico">🎴</div>
              <div>${esc(t('variant.blind'))}</div>
            </button>
          </div>
        </div>
      `;
    }
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
