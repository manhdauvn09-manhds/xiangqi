// Time Display Component - Shows game clocks in online/timed modes

import { t } from '../i18n/i18n.js';

export function createTimeDisplay(timeControl) {
  const container = document.createElement('div');
  container.className = 'time-display';

  if (!timeControl || !timeControl.getStatus().active) {
    container.style.display = 'none';
    return container;
  }

  const status = timeControl.getStatus();

  container.innerHTML = `
    <div class="time-clock red-clock" data-player="red">
      <div class="time-label">${t('side.red')}</div>
      <div class="time-value" id="redTimeValue">${status.red}</div>
    </div>
    <div class="time-clock black-clock" data-player="black">
      <div class="time-label">${t('side.black')}</div>
      <div class="time-value" id="blackTimeValue">${status.black}</div>
    </div>
  `;

  // Listen for time updates
  window.addEventListener('timeUpdate', (e) => {
    const { player, time } = e.detail;
    const formatted = timeControl.formatTime(time);
    const valueEl = document.getElementById(
      player === 'red' ? 'redTimeValue' : 'blackTimeValue'
    );

    if (valueEl) {
      valueEl.textContent = formatted;

      // Visual warning when time is low (< 1 minute)
      const clockEl = container.querySelector(`.${player}-clock`);
      if (time < 60000) {
        clockEl?.classList.add('low-time');
      } else {
        clockEl?.classList.remove('low-time');
      }

      // Critical warning when time is very low (< 20 seconds)
      if (time < 20000) {
        clockEl?.classList.add('critical-time');
      } else {
        clockEl?.classList.remove('critical-time');
      }
    }
  });

  return container;
}

// CSS styles for time display
export const timeDisplayStyles = `
  .time-display {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: 8px 0;
    padding: 8px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 6px;
  }

  .time-clock {
    flex: 1;
    text-align: center;
    padding: 6px;
    border-radius: 4px;
    background: white;
    border: 2px solid #ccc;
  }

  .time-clock.red-clock {
    border-color: #cc3333;
  }

  .time-clock.black-clock {
    border-color: #333333;
  }

  .time-label {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .time-value {
    font-size: 18px;
    font-weight: bold;
    font-family: 'Monaco', 'Courier New', monospace;
    color: #333;
    transition: all 0.3s ease;
  }

  .time-clock.red-clock .time-value {
    color: #cc3333;
  }

  .time-clock.black-clock .time-value {
    color: #333333;
  }

  /* Low time warning (< 1 minute) */
  .time-clock.low-time {
    background: #fff3cd;
    border-color: #ffc107;
  }

  .time-clock.low-time .time-value {
    color: #ff6b6b;
  }

  /* Critical time warning (< 20 seconds) */
  .time-clock.critical-time {
    background: #f8d7da;
    border-color: #dc3545;
    animation: pulse-critical 0.6s infinite;
  }

  .time-clock.critical-time .time-value {
    color: #dc3545;
    font-weight: 900;
  }

  @keyframes pulse-critical {
    0%, 100% {
      box-shadow: inset 0 0 0 2px rgba(220, 53, 69, 0.3);
    }
    50% {
      box-shadow: inset 0 0 8px 2px rgba(220, 53, 69, 0.5);
    }
  }

  /* Dark theme */
  @media (prefers-color-scheme: dark) {
    .time-display {
      background: rgba(255, 255, 255, 0.05);
    }

    .time-clock {
      background: rgba(255, 255, 255, 0.1);
      border-color: #555;
    }

    .time-label {
      color: #aaa;
    }

    .time-value {
      color: #fff;
    }

    .time-clock.low-time {
      background: rgba(255, 193, 7, 0.2);
      border-color: #ffc107;
    }

    .time-clock.critical-time {
      background: rgba(220, 53, 69, 0.2);
      border-color: #dc3545;
    }
  }
`;

export default createTimeDisplay;
