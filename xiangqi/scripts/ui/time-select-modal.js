// Time Selection Modal for Online Play
// Lets players choose Blitz, Rapid, or No Clock before finding a match

import { t } from '../i18n/i18n.js';
import { TIME_FORMATS } from '../game/time-control.js';

export function openTimeSelectModal() {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'xq-modal-backdrop';
    document.body.appendChild(back);

    back.innerHTML = `
      <div class="xq-modal" role="dialog" aria-modal="true">
        <div class="xq-modal-head">
          <h2>${t('time.title')}</h2>
        </div>
        <div class="xq-modal-body">
          <p class="muted small" style="margin-bottom: 16px;">
            Choose your preferred time control for this match.
          </p>

          <div class="time-select-grid">
            <button class="time-option" data-time="blitz">
              <div class="time-option-title">⚡ ${t('time.blitz')}</div>
              <div class="time-option-desc">Fast-paced game<br>for quick matches</div>
            </button>

            <button class="time-option" data-time="rapid">
              <div class="time-option-title">🎯 ${t('time.rapid')}</div>
              <div class="time-option-desc">Balanced gameplay<br>for tactical depth</div>
            </button>

            <button class="time-option" data-time="no_clock">
              <div class="time-option-title">∞ ${t('time.no_clock')}</div>
              <div class="time-option-desc">No time pressure<br>unlimited thinking</div>
            </button>
          </div>

          <div style="margin-top: 16px">
            <button class="btn btn-secondary" style="width: 100%;" data-action="cancel">
              ${t('btn.cancel')}
            </button>
          </div>
        </div>
      </div>`;

    const buttons = back.querySelectorAll('[data-time]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.time;
        back.remove();
        resolve(format);
      });
    });

    const cancelBtn = back.querySelector('[data-action="cancel"]');
    cancelBtn.addEventListener('click', () => {
      back.remove();
      resolve(null);
    });

    back.addEventListener('click', (e) => {
      if (e.target === back) {
        back.remove();
        resolve(null);
      }
    });
  });
}

// CSS for time selection modal
export const timeSelectStyles = `
  .time-select-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin: 16px 0;
  }

  @media (min-width: 480px) {
    .time-select-grid {
      grid-template-columns: 1fr 1fr;
    }

    .time-select-grid .time-option:nth-child(3) {
      grid-column: 1 / -1;
    }
  }

  .time-option {
    padding: 16px;
    border: 2px solid #ddd;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }

  .time-option:hover {
    border-color: #007bff;
    background: #f0f8ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
  }

  .time-option:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0, 123, 255, 0.1);
  }

  .time-option-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 6px;
    color: #333;
  }

  .time-option-desc {
    font-size: 13px;
    color: #666;
    line-height: 1.4;
  }

  @media (prefers-color-scheme: dark) {
    .time-option {
      background: #2a2a2a;
      border-color: #444;
    }

    .time-option:hover {
      background: #1a3a4a;
      border-color: #0d6efd;
    }

    .time-option-title {
      color: #fff;
    }

    .time-option-desc {
      color: #aaa;
    }
  }
`;

export default openTimeSelectModal;
