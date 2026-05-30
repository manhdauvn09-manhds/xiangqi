// Cờ Tướng Vương — game controller
import { OPP } from '../core/constants.js';
import { createInitialBoard, applyMove, undoMove, pieceAt, findGeneral, toFEN } from '../core/board.js';
import { isCheck, isFacingGenerals, detectGameResult, generateLegalMoves, isThreefoldRepetition } from '../core/rules.js';
import { movesForPiece } from '../core/moves.js';
import { moveToVN, moveToICCS, iccsToMove } from '../core/notation.js';
import { createBoardRenderer } from './board-renderer.js';
import { t, onChange as onLangChange } from '../i18n/i18n.js';
import { toast, confirm } from './toast.js';
import { getProfile, setProfile, getSettings, setSettings, appendGame, saveGameSession, clearGameSession } from '../storage/local.js';
import { SoundFX, setEnabled as setSoundEnabled } from '../sound/sound.js';
import { createBlindBoard, generateBlindLegalMoves, applyBlindMove, undoBlindMove, genSeed } from '../variants/blind.js';
import * as wsClient from '../net/ws-client.js';
import { games as apiGames, isAuthed, getUser } from '../net/api.js';
import { createChatPanel } from './chat-panel.js';
import { TimeControl, TIME_FORMATS } from '../game/time-control.js';
import { fakePlayerManager } from '../game/fake-players.js';
import { createTimeDisplay } from './time-display.js';
import { updateElo } from '../elo/elo.js';

const ELO_BY_LV = [600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];

export class GameController {
  constructor(els, config) {
    this.els = els;
    this.config = config;
    // Ensure gameId for bot/local games (needed for FakePlayers)
    if (!config.gameId) {
      config.gameId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    this.variant = config.variant === 'blind' ? 'blind' : 'standard';
    this.userSide = config.userSide || 'r';
    this.botSide = OPP[this.userSide];
    this.selected = null;
    this.legalForSelected = [];
    this.isThinking = false;
    this.gameEnded = false;
    this.movesLog = [];
    this.iccsHistory = [];
    this.fenHistory = [];  // Track FEN after each move for repetition detection

    // Init board theo variant
    if (this.variant === 'blind') {
      this.blindSeed = config.blindSeed || genSeed();
      this.board = createBlindBoard(this.blindSeed);
    } else {
      this.board = createInitialBoard('standard');
    }

    // Load from saved session if resuming
    if (config.resumedFromSession && config.fen && config.moves) {
      try {
        // Replay all moves to restore board state
        if (config.moves && Array.isArray(config.moves)) {
          for (const moveRecord of config.moves) {
            // moveRecord has: { side, san, iccs, reveal? }
            // ICCS có thể là 4-5 ký tự (rank 10 chiếm 2 ký tự) — dùng iccsToMove để parse đúng
            const parsed = moveRecord.iccs ? iccsToMove(moveRecord.iccs) : null;
            if (!parsed) continue;
            const moves = generateLegalMoves(this.board, this.board.side);
            const move = moves.find(m =>
              m.from.file === parsed.from.file && m.from.rank === parsed.from.rank &&
              m.to.file   === parsed.to.file   && m.to.rank   === parsed.to.rank);
            if (move) {
              if (this.variant === 'blind') applyBlindMove(this.board, move);
              else applyMove(this.board, move);
              // Cập nhật fenHistory cho phát hiện lặp lại 3 lần khi resume
              if (!moveRecord.reveal && this.variant === 'standard') {
                this.fenHistory.push(toFEN(this.board));
              }
            }
          }
        }
        this.movesLog = config.moves.slice();
        this.iccsHistory = config.iccsHistory ? config.iccsHistory.slice() : [];
      } catch (e) {
        console.error('Failed to restore game from session:', e);
        // Fall back to initial board
        if (this.variant === 'blind') {
          this.blindSeed = config.blindSeed || genSeed();
          this.board = createBlindBoard(this.blindSeed);
        } else {
          this.board = createInitialBoard('standard');
        }
        this.movesLog = [];
        this.iccsHistory = [];
      }
    }

    // Init sound from settings
    setSoundEnabled(getSettings().sound !== false);

    // Init time control if config has time setting
    this.timeControl = null;
    this.timeDisplay = null;
    this.moveStartTime = Date.now();
    if (config.time) {
      const format = this._getTimeFormat(config.time);
      this.timeControl = new TimeControl(format);
      // Listen for time expiration and updates
      this._timeExpiredHandler = (e) => this._onTimeExpired(e);
      this._timeUpdateHandler = () => this.updateStatus();
      window.addEventListener('timeExpired', this._timeExpiredHandler);
      window.addEventListener('timeUpdate', this._timeUpdateHandler);
      // Start game clock for red
      const startPlayer = config.userSide === 'r' && config.mode === 'bot' && this.botSide === 'r' ? 'black' : 'red';
      this.timeControl.startTurn(startPlayer);
      // Create time display component
      this.timeDisplay = createTimeDisplay(this.timeControl);
      if (this.timeDisplay && els.statusEl) {
        // Insert time display before status element for prominence
        els.statusEl.parentElement?.insertBefore(this.timeDisplay, els.statusEl);
      }
    }

    this.renderer = createBoardRenderer(els.boardHost, (f, r) => this.onSquareClick(f, r), {
      flipped: this.userSide === 'b',
    });
    this.renderer.setBoard(this.board);
    this.updateInfo();
    this.updateStatus();
    this.aiWorker = null;
    this.lastHint = null;

    if (els.btnResign)   els.btnResign.addEventListener('click', () => this.handleResign());
    if (els.btnFlip)     els.btnFlip.addEventListener('click', () => this.renderer.flip());
    if (els.btnNew)      els.btnNew.addEventListener('click', () => this.requestNewGame());
    if (els.btnTakeback) els.btnTakeback.addEventListener('click', () => this.handleTakeback());
    if (els.btnHint)     els.btnHint.addEventListener('click', () => this.handleHint());
    if (els.btnBackHome) els.btnBackHome.addEventListener('click', () => this.handleBackHome());

    this._unsubLang = onLangChange(() => { this.updateInfo(); this.updateStatus(); });

    // ── Online mode wiring
    if (this.config.mode === 'online') {
      this._wsUnsubs = [];
      this._wsUnsubs.push(wsClient.on('game.moved', (msg) => this._onRemoteMove(msg)));
      this._wsUnsubs.push(wsClient.on('game.ended', (msg) => this._onRemoteEnd(msg)));
      this._wsUnsubs.push(wsClient.on('game.draw_offered', (msg) => this._onDrawOffer(msg)));
      this._wsUnsubs.push(wsClient.on('game.draw_declined', () => toast(t('online.draw_declined'), { type: 'warn' })));
      this._wsUnsubs.push(wsClient.on('disconnected', () => {
        toast(t('online.disconnected'), { type: 'warn' });
      }));

      // ── Chat Panel (Phase 3)
      this.chatPanel = createChatPanel(this.config.gameId, getUser()?.displayName || '?');
      els.boardHost?.parentElement?.appendChild(this.chatPanel);
      // Chat messages handled by chat-panel.js directly via wsClient.on
    }

    // Bot/Fake opponent Đỏ đi trước nếu user cầm Đen
    const isBotRed = (this.config.mode === 'bot' && this.botSide === 'r') ||
                     (this.config.mode === 'online' && this.config.fakeOpponent && this.userSide === 'b');
    if (isBotRed) {
      setTimeout(() => {
        this.botMove();
      }, 300);
    }

    // Auto-save game when user navigates away
    this._handleBeforeUnload = () => {
      if (!this.gameEnded) {
        this.saveGameSession();
      }
    };
    window.addEventListener('beforeunload', this._handleBeforeUnload);
    window.addEventListener('hashchange', this._handleBeforeUnload);
  }

  _onRemoteMove(msg) {
    if (msg.gameId !== this.config.gameId) return;
    const m = msg.move;
    if (!m || !m.from || !m.to) return;
    // Apply nước của đối thủ
    this.commitMove(m, /*remote=*/true);
  }

  _onRemoteEnd(msg) {
    if (msg.gameId !== this.config.gameId) return;
    const winner = msg.result === '1-0' ? 'r' : (msg.result === '0-1' ? 'b' : null);
    this.endGame({ ended: true, winner, reason: msg.reason || 'unknown' });
  }

  async _onDrawOffer(msg) {
    const ok = await confirm({
      title: t('online.draw_offered_title'),
      body: `<p>${t('online.draw_offered_body')}</p>`,
      okText: t('btn.accept'),
      cancelText: t('btn.decline'),
    });
    wsClient.send('game.draw_response', {
      gameId: this.config.gameId,
      accept: ok,
    });
  }

  destroy() {
    // Save game before destroying
    if (!this.gameEnded) {
      this.saveGameSession();
    }

    if (this.aiWorker) {
      this.aiWorker.terminate();
      this.aiWorker = null;
    }
    this._unsubLang && this._unsubLang();
    if (this._wsUnsubs) this._wsUnsubs.forEach(fn => fn && fn());
    if (this.timeControl) {
      this.timeControl.stop();
      window.removeEventListener('timeExpired', this._timeExpiredHandler);
      window.removeEventListener('timeUpdate', this._timeUpdateHandler);
      this.timeControl = null;
    }
    if (this.timeDisplay) {
      this.timeDisplay.remove();
      this.timeDisplay = null;
    }
    if (this._handleBeforeUnload) {
      window.removeEventListener('beforeunload', this._handleBeforeUnload);
      window.removeEventListener('hashchange', this._handleBeforeUnload);
      this._handleBeforeUnload = null;
    }
    if (this.chatPanel) {
      this.chatPanel._chatAPI?.destroy();
      this.chatPanel.remove();
      this.chatPanel = null;
    }
  }

  ensureWorker() {
    if (this.aiWorker) return this.aiWorker;
    this.aiWorker = new Worker(new URL('../ai/ai.worker.js', import.meta.url), { type: 'module' });
    return this.aiWorker;
  }

  saveGameSession() {
    // Save current game state for resuming later (bot & local modes only)
    if (this.gameEnded) {
      clearGameSession();
      return;
    }
    try {
      const fen = toFEN(this.board);
      saveGameSession({
        mode: this.config.mode,
        variant: this.variant,
        userSide: this.userSide,
        botLevel: this.config.botLevel,
        fen: fen,
        moves: this.movesLog.slice(),
        iccsHistory: this.iccsHistory.slice(),
        blindSeed: this.variant === 'blind' ? this.blindSeed : undefined,
      });
    } catch (e) {
      console.error('Failed to save game session:', e);
    }
  }

  onSquareClick(file, rank) {
    if (this.gameEnded || this.isThinking) return;
    if ((this.config.mode === 'bot' || this.config.mode === 'online') && this.board.side !== this.userSide) return;

    const piece = pieceAt(this.board, file, rank);

    if (this.selected) {
      // re-select cùng phe (chỉ cho cờ ngửa và cho quân đã lật ở cờ úp)
      if (piece && !piece.hidden && piece.side === this.board.side) {
        this.selectSquare(file, rank);
        return;
      }
      const move = this.legalForSelected.find(m => m.to.file === file && m.to.rank === rank);
      if (move) {
        this.commitMove(move);
        return;
      }
      this.selectSquare(null);
      return;
    }

    // Chưa chọn
    if (this.variant === 'blind' && piece && piece.hidden) {
      // Lật quân úp
      this.commitMove({ from: { file, rank }, to: { file, rank }, reveal: true });
      return;
    }
    if (piece && !piece.hidden && piece.side === this.board.side) {
      this.selectSquare(file, rank);
    }
  }

  selectSquare(fileOrNull, rank) {
    if (fileOrNull == null) {
      this.selected = null;
      this.legalForSelected = [];
      this.renderer.setSelected(null, []);
      return;
    }
    const f = fileOrNull, r = rank;
    this.selected = { file: f, rank: r };
    const pseudo = movesForPiece(this.board, f, r);
    this.legalForSelected = pseudo.filter(m => {
      applyMove(this.board, m);
      const movedSide = OPP[this.board.side];
      let ok = !isCheck(this.board, movedSide) && !isFacingGenerals(this.board);

      // Chặn nước đi tạo thế lặp lần 3
      if (ok) {
        const fen = toFEN(this.board);
        let count = 0;
        for (const f of this.fenHistory) { if (f === fen) count++; }
        if (count >= 2) ok = false; // sẽ là lần thứ 3 → không hợp lệ
      }

      undoMove(this.board);
      return ok;
    });
    this.renderer.setSelected(this.selected, this.legalForSelected.map(m => m.to));
  }

  commitMove(move, remote = false) {
    const piece = pieceAt(this.board, move.from.file, move.from.rank);
    let captured = null;
    let san;

    if (move.reveal) {
      // Lật quân úp (cờ úp)
      applyBlindMove(this.board, move);
      SoundFX.flip();
      san = '🎴 ' + (piece ? piece.type : '?');
    } else {
      const target = pieceAt(this.board, move.to.file, move.to.rank);
      captured = target;
      if (this.variant === 'blind') applyBlindMove(this.board, move);
      else applyMove(this.board, move);
      if (captured) SoundFX.capture();
      else SoundFX.move();
      san = moveToVN(piece, move);
    }

    this.movesLog.push({
      side: piece.side,
      san,
      iccs: moveToICCS({ from: move.from, to: move.to }),
      reveal: !!move.reveal,
    });
    this.iccsHistory.push(moveToICCS({ from: move.from, to: move.to }));

    this.selected = null;
    this.legalForSelected = [];
    this.renderer.setBoard(this.board);
    this.renderer.setSelected(null, []);
    this.renderer.setLastMove(move.reveal ? null : move);
    this.updateInfo();
    this.updateMovesLog();

    // Repetition detection: track FEN after each move
    if (!move.reveal) {
      const fen = toFEN(this.board);
      this.fenHistory.push(fen);
    }

    // Time control: end turn for the player who just moved
    if (this.timeControl) {
      const justMovedPlayer = this.movesLog[this.movesLog.length - 1].side === 'r' ? 'red' : 'black';
      const moveTime = Date.now() - this.moveStartTime;
      const timeExpired = this.timeControl.endTurn(justMovedPlayer, moveTime);
      if (timeExpired) {
        const winner = justMovedPlayer === 'red' ? 'b' : 'r';
        this.endGame({ ended: true, winner, reason: 'time' });
        return;
      }
    }

    // Status
    const sideToMove = this.board.side;
    const inCheck = isCheck(this.board, sideToMove);
    if (inCheck) {
      const k = findGeneral(this.board, sideToMove);
      this.renderer.setInCheck(k);
      SoundFX.check();
    } else {
      this.renderer.setInCheck(null);
    }

    // Time control: start turn for the next player
    if (this.timeControl) {
      const nextPlayer = sideToMove === 'r' ? 'red' : 'black';
      this.timeControl.startTurn(nextPlayer);
      this.moveStartTime = Date.now();
    }

    // Online: gửi nước qua WS (chỉ khi đây là nước local, không phải remote echo)
    if (this.config.mode === 'online' && !remote) {
      wsClient.send('game.move', {
        gameId: this.config.gameId,
        move: { from: move.from, to: move.to, reveal: move.reveal },
      });
    }

    let result = detectGameResult(this.board);

    // Check for 3-fold repetition
    if (!result.ended && this.fenHistory.length >= 5) {
      if (isThreefoldRepetition(this.fenHistory)) {
        result = { ended: true, winner: null, reason: 'threefold_repetition' };
      }
    }

    if (result.ended) {
      // Online: báo server kết quả
      if (this.config.mode === 'online' && !remote) {
        wsClient.send('game.end', {
          gameId: this.config.gameId,
          winner: result.winner,
          reason: result.reason,
        });
      }
      this.endGame(result);
      return;
    }
    this.updateStatus();

    // Save game session for resuming later
    if (this.config.mode === 'bot' || this.config.mode === 'local') {
      this.saveGameSession();
    }

    // Trigger bot move for bot games or online games with fake opponents
    const isBotTurn = (this.config.mode === 'bot' || (this.config.mode === 'online' && this.config.fakeOpponent))
                      && this.board.side === this.botSide;
    if (isBotTurn) {
      setTimeout(() => this.botMove(), 250);
    }
  }

  async botMove() {
    if (this.gameEnded) return;
    this.isThinking = true;
    this.updateStatus();

    // Cờ úp: bot đơn giản hơn — random reveal hoặc move legal
    if (this.variant === 'blind') {
      const moves = generateBlindLegalMoves(this.board, this.board.side);
      if (moves.length === 0) { this.endGame(detectGameResult(this.board)); this.isThinking=false; return; }
      // Ưu tiên ăn quân, sau đó di chuyển, cuối cùng lật
      const captures = moves.filter(m => !m.reveal && pieceAt(this.board, m.to.file, m.to.rank));
      const movesNorm = moves.filter(m => !m.reveal);
      const reveals = moves.filter(m => m.reveal);
      const pool = captures.length ? captures : (movesNorm.length ? movesNorm : reveals);
      const m = pool[Math.floor(Math.random() * pool.length)];
      this.isThinking = false;
      this.commitMove(m);
      return;
    }

    // Use FakePlayers if it's a bot game or online with fake opponent
    const botLevel = this.config.botLevel || this.config.difficulty;
    if ((this.config.mode === 'bot' || this.config.fakeOpponent) && botLevel) {
      const moves = generateLegalMoves(this.board, this.board.side);
      if (moves.length === 0) {
        this.isThinking = false;
        this.endGame(detectGameResult(this.board));
        return;
      }
      try {
        const move = await fakePlayerManager.makeMove(this.config.gameId, this.board, moves);
        this.isThinking = false;
        if (move) this.commitMove(move);
        else this.endGame(detectGameResult(this.board));
      } catch (err) {
        console.error('FakePlayers error:', err);
        toast(t('toast.bot_error') + ': ' + err.message, { type: 'error' });
        this.isThinking = false;
      }
      return;
    }

    // Fallback to AI worker
    const worker = this.ensureWorker();
    const fen = toFEN(this.board);
    const level = this.config.botLevel || 3;

    return new Promise((resolve) => {
      const onMsg = (e) => {
        const msg = e.data;
        if (msg.type === 'progress') return;
        if (msg.type === 'error') {
          toast(t('toast.bot_error') + ': ' + msg.message, { type: 'error' });
          worker.removeEventListener('message', onMsg);
          this.isThinking = false; resolve(); return;
        }
        if (msg.type === 'result') {
          worker.removeEventListener('message', onMsg);
          this.isThinking = false;
          if (msg.move) this.commitMove(msg.move);
          else this.endGame(detectGameResult(this.board));
          resolve();
        }
      };
      worker.addEventListener('message', onMsg);
      worker.postMessage({ cmd: 'search', fen, level, iccsHistory: this.iccsHistory });
    });
  }

  async handleHint() {
    if (this.gameEnded || this.isThinking) return;
    if (this.config.mode !== 'bot') {
      toast(t('toast.hint_bot_only'), { type: 'warn' });
      return;
    }
    if (this.variant === 'blind') {
      toast(t('toast.hint_no_blind'), { type: 'warn' });
      return;
    }
    if (this.board.side !== this.userSide) return;
    this.isThinking = true;
    this.updateStatus();
    const worker = this.ensureWorker();
    const fen = toFEN(this.board);
    return new Promise(resolve => {
      const onMsg = (e) => {
        const msg = e.data;
        if (msg.type === 'hint') {
          worker.removeEventListener('message', onMsg);
          this.isThinking = false;
          this.updateStatus();
          if (!msg.moves || msg.moves.length === 0) { resolve(); return; }
          // Highlight nước hint số 1
          const top = msg.moves[0].move;
          this.lastHint = top;
          this.renderer.setSelected(top.from, [top.to]);
          const piece = pieceAt(this.board, top.from.file, top.from.rank);
          toast(`💡 ${t('hint.try')}: ${moveToVN(piece, top)}`, { duration: 3500 });
          resolve();
        }
      };
      worker.addEventListener('message', onMsg);
      worker.postMessage({ cmd: 'hint', fen });
    });
  }

  handleTakeback() {
    if (this.gameEnded || this.isThinking) return;
    if (this.config.mode !== 'bot') {
      toast(t('toast.takeback_bot_only'), { type: 'warn' });
      return;
    }
    // Lùi 2 nước (nước bot + nước người) để về lượt người
    let toUndo = (this.board.side === this.userSide) ? 2 : 1;
    while (toUndo > 0 && this.board.history.length > 0) {
      if (this.variant === 'blind') undoBlindMove(this.board);
      else undoMove(this.board);
      this.movesLog.pop();
      this.iccsHistory.pop();
      if (this.fenHistory.length) this.fenHistory.pop();  // đồng bộ tracking lặp lại
      toUndo--;
    }
    this.renderer.setBoard(this.board);
    this.renderer.setSelected(null, []);
    this.renderer.setLastMove(this.movesLog.length ? lastMoveFromLog(this.iccsHistory) : null);
    this.renderer.setInCheck(null);
    this.updateStatus();
    this.updateMovesLog();
  }

  endGame(result) {
    this.gameEnded = true;
    // Clear session when game ends
    clearGameSession();
    // Release fake player if it was a bot game
    const botLevel = this.config.botLevel || this.config.difficulty;
    if ((this.config.mode === 'bot' || this.config.fakeOpponent) && botLevel) {
      fakePlayerManager.releasePlayer(this.config.gameId);
    }
    let winner = result.winner;
    let myResult = 0.5;
    if (winner === this.userSide) myResult = 1;
    else if (winner && winner !== this.userSide) myResult = 0;

    let titleKey = 'result.title.draw';
    if (myResult === 1) titleKey = 'result.title.win';
    else if (myResult === 0) titleKey = 'result.title.loss';

    if (myResult === 1) SoundFX.win();
    else if (myResult === 0) SoundFX.lose();
    else SoundFX.draw();

    const reasonKey = `result.by_${result.reason}`;

    if (this.config.mode === 'bot' || this.config.mode === 'local') {
      const profile = getProfile();
      profile.gamesPlayed += 1;
      if (myResult === 1) profile.wins += 1;
      else if (myResult === 0) profile.losses += 1;
      else profile.draws += 1;

      // Calculate ELO for bot and online (with fake opponent) modes
      if (this.config.mode === 'bot' || this.config.fakeOpponent) {
        const myElo = profile.elo || 1200;
        // Get opponent ELO based on game type
        let opponentElo = 1200;
        if (this.config.mode === 'bot' && this.config.botLevel) {
          opponentElo = ELO_BY_LV[this.config.botLevel - 1];
        } else if (this.config.fakeOpponent && this.config.opponent?.elo) {
          opponentElo = this.config.opponent.elo;
        }

        // Calculate new ELO
        const eloCalc = updateElo(myElo, opponentElo, myResult, profile.gamesPlayed - 1);
        profile.elo = eloCalc.newElo;
        this.eloChange = eloCalc.delta; // Store for result dialog display
      } else {
        this.eloChange = 0; // No ELO change for local games
      }

      setProfile(profile);
      const record = {
        id: 'g_' + Date.now(),
        playedAt: Date.now(),
        mode: this.config.mode,
        botLevel: this.config.botLevel,
        userSide: this.userSide,
        variant: this.variant,
        result: winner === 'r' ? '1-0' : (winner === 'b' ? '0-1' : '1/2-1/2'),
        reason: result.reason,
        moves: this.movesLog.slice(),
        finalFEN: toFEN(this.board),
        blindSeed: this.blindSeed,
      };
      appendGame(record);
      // Sync up to backend nếu authed
      if (isAuthed()) {
        apiGames.save({
          variant: this.variant,
          mode: this.config.mode,
          user_side: this.userSide,
          bot_level: this.config.botLevel,
          result: record.result,
          reason: result.reason,
          moves: this.movesLog,
          duration_ms: 0,
          blind_seed: this.blindSeed ? String(this.blindSeed) : null,
        }).catch(err => console.warn('save game failed', err));
      }
    }

    setTimeout(async () => {
      // Build result message with ELO change if available
      let reasonText = `<p>${t(reasonKey)}</p>`;
      let eloText = '';

      if (this.config.mode === 'bot') {
        reasonText += `<p style="margin-top:8px" class="muted">${t('side.bot')} Lv ${this.config.botLevel} (~${ELO_BY_LV[(this.config.botLevel||3)-1]} ELO)</p>`;
      }

      // Add ELO change display
      if (this.eloChange !== undefined && (this.config.mode === 'bot' || this.config.fakeOpponent)) {
        const eloSign = this.eloChange > 0 ? '+' : '';
        const eloColor = this.eloChange > 0 ? '#06d6a0' : '#e63946';
        eloText = `<p style="margin-top:12px; color:${eloColor}; font-weight:700">
          <span style="font-size:16px">${eloSign}${this.eloChange}</span> ELO
        </p>`;
      }

      const ok = await confirm({
        title: t(titleKey),
        body: reasonText + eloText,
        okText: t('result.play_again'),
        cancelText: t('result.back_home'),
      });
      if (ok) this.requestNewGame();
      else this.goHome();
    }, 500);
  }

  async handleResign() {
    if (this.gameEnded) return;
    const ok = await confirm({
      title: t('btn.resign'),
      body: `<p>${t('toast.confirm_resign')}</p>`,
      okText: t('btn.confirm'),
      cancelText: t('btn.cancel'),
    });
    if (!ok) return;
    this.endGame({ ended: true, winner: OPP[this.userSide], reason: 'resign' });
  }

  async handleBackHome() {
    if (!this.gameEnded) {
      const ok = await confirm({
        title: t('btn.back_home'),
        body: `<p>Trò chơi chưa kết thúc. Bạn chắc chắn muốn về trang chủ?</p>`,
        okText: t('btn.confirm'),
        cancelText: t('btn.cancel'),
      });
      if (!ok) return;
      // If game is ongoing, resign first (count as loss for all modes)
      this.endGame({ ended: true, winner: OPP[this.userSide], reason: 'resign' });
      return; // endGame will handle navigation after showing result
    }
    this.goHome();
  }

  requestNewGame() { document.dispatchEvent(new CustomEvent('xq:new-game')); }
  goHome()         { document.dispatchEvent(new CustomEvent('xq:home')); }

  updateInfo() {
    const e = this.els;
    if (!e) return;
    const isBotMode = this.config.mode === 'bot';
    const userLabel = getProfile().name || t('side.you');
    const botLabel = isBotMode ? `🤖 Bot Lv ${this.config.botLevel}` : '👥 ' + t('side.opponent');
    if (e.redInfoEl)   e.redInfoEl.textContent  = this.userSide === 'r' ? userLabel : botLabel;
    if (e.blackInfoEl) e.blackInfoEl.textContent = this.userSide === 'b' ? userLabel : botLabel;
  }

  updateStatus() {
    const e = this.els;
    if (!e || !e.statusEl) return;
    if (this.gameEnded) return;
    let key;
    if (this.config.mode === 'bot') {
      if (this.isThinking) key = 'status.bot_thinking';
      else if (this.board.side === this.userSide) key = 'status.your_turn';
      else key = 'status.opp_turn';
    } else {
      e.statusEl.textContent = `${t('status.your_turn')} — ${t(this.board.side === 'r' ? 'side.red' : 'side.black')}`;
      return;
    }
    let txt = t(key);
    if (isCheck(this.board, this.board.side)) txt += ' · ' + t('status.check');
    if (this.timeControl) {
      const status = this.timeControl.getStatus();
      const playerTime = this.board.side === 'r' ? status.red : status.black;
      txt += ` · ⏱ ${playerTime}`;
    }
    e.statusEl.textContent = txt;
  }

  updateMovesLog() {
    const el = this.els.movesEl;
    if (!el) return;
    if (this.movesLog.length === 0) {
      el.innerHTML = `<div class="empty">${esc(t('log.empty'))}</div>`;
      return;
    }
    const settings = getSettings();
    const useICCS = settings.notation === 'iccs';
    const rows = [];
    for (let i = 0; i < this.movesLog.length; i += 2) {
      const r = this.movesLog[i];
      const b = this.movesLog[i + 1];
      const idx = (i / 2 + 1);
      const rTxt = r ? (useICCS ? r.iccs : r.san) : '';
      const bTxt = b ? (useICCS ? b.iccs : b.san) : '';
      rows.push(`<tr><td class="idx">${idx}.</td><td class="r">${esc(rTxt)}</td><td class="b">${esc(bTxt)}</td></tr>`);
    }
    el.innerHTML = `<table>${rows.join('')}</table>`;
    el.scrollTop = el.scrollHeight;
  }

  _getTimeFormat(timeStr) {
    if (!timeStr) return TIME_FORMATS.NO_CLOCK;
    const initial = parseInt(timeStr.split('+')[0], 10);
    if (initial <= 5) return TIME_FORMATS.BLITZ;
    if (initial <= 10) return TIME_FORMATS.RAPID;
    return TIME_FORMATS.RAPID;
  }

  _onTimeExpired(e) {
    if (!this.timeControl) return;
    const player = e.detail?.player;
    const opponent = player === 'red' ? 'black' : 'red';
    const winner = opponent === 'red' ? 'r' : 'b';
    this.endGame({ ended: true, winner, reason: 'time' });
  }
}

function lastMoveFromLog(iccsHistory) {
  if (!iccsHistory || !iccsHistory.length) return null;
  return iccsToMove(iccsHistory[iccsHistory.length - 1]);
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
