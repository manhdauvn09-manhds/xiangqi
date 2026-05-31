// Xiangqi Time Control Manager
// Handles game clocks for Blitz, Rapid, and No Clock modes

import { t } from '../i18n/i18n.js';
import { toast } from '../ui/toast.js';

export const TIME_FORMATS = {
  NO_CLOCK: 'no_clock',
  BLITZ: 'blitz',      // 10m initial + 1m per move
  RAPID: 'rapid',      // 20m initial + 2m per move
};

export class TimeControl {
  constructor(format = TIME_FORMATS.NO_CLOCK) {
    this.format = format;
    this.redTime = 0;      // milliseconds
    this.blackTime = 0;    // milliseconds
    this.redMoveTime = 0;  // time allocated per move
    this.blackMoveTime = 0;
    this.currentPlayer = 'red';
    this.moveStartTime = 0;
    this.gameStartTime = 0;
    this.timers = { red: null, black: null };
    this.warningFired = { red: false, black: false };

    this.initializeTime();
  }

  initializeTime() {
    switch (this.format) {
      case TIME_FORMATS.BLITZ:
        this.redTime = 10 * 60 * 1000;      // 10 minutes
        this.blackTime = 10 * 60 * 1000;
        this.redMoveTime = 1 * 60 * 1000;   // 1 minute per move
        this.blackMoveTime = 1 * 60 * 1000;
        break;
      case TIME_FORMATS.RAPID:
        this.redTime = 20 * 60 * 1000;      // 20 minutes
        this.blackTime = 20 * 60 * 1000;
        this.redMoveTime = 2 * 60 * 1000;   // 2 minutes per move
        this.blackMoveTime = 2 * 60 * 1000;
        break;
      case TIME_FORMATS.NO_CLOCK:
      default:
        this.redTime = Infinity;
        this.blackTime = Infinity;
        this.redMoveTime = 0;
        this.blackMoveTime = 0;
    }

    this.gameStartTime = Date.now();
  }

  /**
   * Start the clock for a player's move
   */
  startTurn(player) {
    this.currentPlayer = player;
    this.moveStartTime = Date.now();

    if (this.format === TIME_FORMATS.NO_CLOCK) return;

    this.clearTimer(player);
    this.warningFired[player] = false;
    this.startTimer(player);
  }

  /**
   * Stop the clock and add increment time
   */
  endTurn(player, moveTime) {
    if (this.format === TIME_FORMATS.NO_CLOCK) return;

    this.clearTimer(player);

    // Deduct move time from player's clock
    const timeSpent = moveTime; // in milliseconds
    if (player === 'red') {
      this.redTime = Math.max(0, this.redTime - timeSpent);
      // Add increment
      this.redTime += this.redMoveTime;
    } else {
      this.blackTime = Math.max(0, this.blackTime - timeSpent);
      // Add increment
      this.blackTime += this.blackMoveTime;
    }

    // Check for time expiration
    if (this.getPlayerTime(player) <= 0) {
      this.onTimeExpired(player);
      return true; // indicates time expired
    }

    return false;
  }

  /**
   * Start the clock timer for a player
   */
  startTimer(player) {
    if (this.format === TIME_FORMATS.NO_CLOCK) return;

    this.timers[player] = setInterval(() => {
      const elapsed = Date.now() - this.moveStartTime;

      if (player === 'red') {
        this.redTime = Math.max(0, this.redTime - 1000);
      } else {
        this.blackTime = Math.max(0, this.blackTime - 1000);
      }

      // Update display (delegated to game controller)
      window.dispatchEvent(new CustomEvent('timeUpdate', {
        detail: { player, time: this.getPlayerTime(player) }
      }));

      // Check for time warning (20 seconds)
      if (this.getPlayerTime(player) <= 20000 && !this.warningFired[player]) {
        this.warningFired[player] = true;
        toast(t('time.warning'), { type: 'warning' });
      }

      // Check for time expired
      if (this.getPlayerTime(player) <= 0) {
        this.clearTimer(player);
        this.onTimeExpired(player);
      }
    }, 1000);
  }

  /**
   * Clear the timer for a player
   */
  clearTimer(player) {
    if (this.timers[player]) {
      clearInterval(this.timers[player]);
      this.timers[player] = null;
    }
  }

  /**
   * Handle time expiration
   */
  onTimeExpired(player) {
    toast(`${player === 'red' ? t('side.red') : t('side.black')} ${t('time.expired')}`, {
      type: 'error'
    });

    window.dispatchEvent(new CustomEvent('timeExpired', {
      detail: { player }
    }));
  }

  /**
   * Get remaining time for a player (in milliseconds)
   */
  getPlayerTime(player) {
    return player === 'red' ? this.redTime : this.blackTime;
  }

  /**
   * Get formatted time string (MM:SS)
   */
  formatTime(milliseconds) {
    if (!isFinite(milliseconds)) return '∞';

    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get status for both players
   */
  getStatus() {
    return {
      red: this.formatTime(this.redTime),
      black: this.formatTime(this.blackTime),
      format: this.format,
      active: this.format !== TIME_FORMATS.NO_CLOCK
    };
  }

  /**
   * Stop all timers and cleanup
   */
  stop() {
    this.clearTimer('red');
    this.clearTimer('black');
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.stop();
    this.warningFired = { red: false, black: false };
    this.initializeTime();
  }
}

export default TimeControl;
