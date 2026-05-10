// Online Game Queue - Matchmaking with fake player fallback
// Integrates real players and AI bots based on availability

import { t } from '../i18n/i18n.js';
import { fakePlayerManager } from './fake-players.js';
import { toast } from '../ui/toast.js';

export const QUEUE_STATUS = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  MATCHED: 'matched',
  CANCELED: 'canceled',
  ERROR: 'error',
};

export class OnlineQueue {
  constructor() {
    this.status = QUEUE_STATUS.IDLE;
    this.currentGameId = null;
    this.timeControl = null;
    this.selectedDifficulty = null;
    this.searchTimeout = null;
    this.opponent = null;
    this.listeners = new Map();
  }

  /**
   * Register an event listener for queue events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to all registered listeners
   */
  emit(event, data) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  /**
   * Start searching for an opponent
   * Prefers real players; uses fake player after timeout
   */
  async startSearch(timeControl, difficulty = null) {
    if (this.status === QUEUE_STATUS.SEARCHING) {
      toast(t('online.queue.searching'), { type: 'info' });
      return;
    }

    this.status = QUEUE_STATUS.SEARCHING;
    this.timeControl = timeControl;
    this.selectedDifficulty = difficulty;
    this.currentGameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.emit('statusChange', {
      status: this.status,
      message: t('online.queue.searching'),
    });

    // Try to find real player for 30 seconds, then fallback to fake player
    const realPlayerTimeout = new Promise(resolve => {
      this.searchTimeout = setTimeout(() => {
        resolve(null);
      }, 30000);
    });

    try {
      // Attempt to connect to backend for real player matching
      // If findRealPlayer fails/rejects, continue waiting for timeout
      const realPlayer = await Promise.race([
        this.findRealPlayer().catch(() => null),
        realPlayerTimeout,
      ]);

      if (realPlayer && this.status === QUEUE_STATUS.SEARCHING) {
        // Found a real player
        this.opponent = realPlayer;
        this.status = QUEUE_STATUS.MATCHED;
        toast(`${t('online.queue.matched')} ${realPlayer.name}`, {
          type: 'success',
        });
        this.emit('matched', {
          opponent: this.opponent,
          isFakePlayer: false,
        });
        return;
      }
    } catch (err) {
      console.warn('Real player search error:', err);
    }

    // Fallback: use fake player after 30s timeout
    if (this.status === QUEUE_STATUS.SEARCHING) {
      await this.matchWithFakePlayer();
    }
  }

  /**
   * Try to find a real player via backend
   * This will be implemented when backend matchmaking is ready
   */
  async findRealPlayer() {
    // This would call the backend API
    // For now, always fails gracefully to fallback to fake players
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Backend not available')), 100);
    });
  }

  /**
   * Match with a fake player (AI bot)
   */
  async matchWithFakePlayer() {
    try {
      // Use selected difficulty or random between 3-6
      const difficulty = this.selectedDifficulty ||
        Math.floor(Math.random() * 4) + 3; // 3-6

      const fakePlayer = fakePlayerManager.getPlayerForGame(
        difficulty,
        this.currentGameId
      );

      this.opponent = fakePlayer;
      this.status = QUEUE_STATUS.MATCHED;

      // Brief delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      toast(`${t('online.queue.matched')} ${fakePlayer.name}`, {
        type: 'success',
      });

      this.emit('matched', {
        opponent: this.opponent,
        isFakePlayer: true,
      });
    } catch (err) {
      this.status = QUEUE_STATUS.ERROR;
      toast(`${t('online.queue.cancel')}: ${err.message}`, {
        type: 'error',
      });
      this.emit('error', { error: err });
    }
  }

  /**
   * Cancel the current search
   */
  cancel() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    if (this.currentGameId && this.opponent?.isFakePlayer) {
      fakePlayerManager.releasePlayer(this.currentGameId);
    }

    this.status = QUEUE_STATUS.CANCELED;
    this.opponent = null;
    this.currentGameId = null;

    this.emit('statusChange', {
      status: this.status,
      message: t('online.queue.cancel'),
    });
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      status: this.status,
      gameId: this.currentGameId,
      opponent: this.opponent,
      timeControl: this.timeControl,
      isFakePlayer: this.opponent?.isFakePlayer || false,
    };
  }

  /**
   * Reset queue to idle state
   */
  reset() {
    this.cancel();
    this.status = QUEUE_STATUS.IDLE;
  }
}

/**
 * Global online queue instance
 */
export const onlineQueue = new OnlineQueue();

export default OnlineQueue;
