// Daily Chess Puzzle Training Mode
// Full UI with puzzle board, move input, hints, analysis, progress tracking

import { t } from '../i18n/i18n.js';
import { getDailyChessPuzzle, completePuzzle, skipPuzzle, getSkippedPuzzles, getLevel, getStreak, dateKey } from '../puzzles/chess-bank.js';
import { Board } from '../core/board.js';
import { toFEN, fromFEN, isValidMove, applyMove, undoMove } from '../core/board-ops.js';
import { toast } from './toast.js';

let currentPuzzle = null;
let currentBoard = null;
let moveHistory = [];
let hintShown = false;
let puzzleStartTime = 0;

export function renderDailyChessPage(root) {
  root.innerHTML = '';

  // Get today's puzzle
  currentPuzzle = getDailyChessPuzzle(new Date());
  if (!currentPuzzle) {
    root.innerHTML = `<div class="xq-daily-error">${t('error_no_puzzle')}</div>`;
    return;
  }

  // Initialize board from FEN
  currentBoard = new Board();
  fromFEN(currentBoard, currentPuzzle.fen);
  moveHistory = [];
  hintShown = false;
  puzzleStartTime = Date.now();

  // Main layout
  const page = document.createElement('div');
  page.className = 'xq-daily-page';

  // Header with progress
  const header = createHeader();
  page.appendChild(header);

  // Main content
  const content = document.createElement('div');
  content.className = 'xq-daily-content';

  // Board and puzzle info
  const boardSection = createBoardSection();
  content.appendChild(boardSection);

  // Controls
  const controls = createControls();
  content.appendChild(controls);

  page.appendChild(content);
  root.appendChild(page);

  // Add CSS styles
  if (!document.getElementById('daily-chess-styles')) {
    const style = document.createElement('style');
    style.id = 'daily-chess-styles';
    style.textContent = getDailyChessStyles();
    document.head.appendChild(style);
  }
}

function createHeader() {
  const header = document.createElement('div');
  header.className = 'xq-daily-header';

  const title = document.createElement('h1');
  title.className = 'xq-daily-title';
  title.textContent = '♟️ ' + t('daily_chess_title');

  const progress = document.createElement('div');
  progress.className = 'xq-daily-progress';

  const streak = getStreak();
  const level = getLevel();

  const streakText = document.createElement('div');
  streakText.className = 'xq-daily-streak';
  streakText.innerHTML = `<span class="xq-streak-label">${t('streak')}:</span> <span class="xq-streak-value">${streak}</span>`;

  const levelText = document.createElement('div');
  levelText.className = 'xq-daily-level';
  levelText.innerHTML = `<span class="xq-level-label">${t('level')}:</span> <span class="xq-level-value">${level}/100</span>`;

  progress.appendChild(streakText);
  progress.appendChild(levelText);

  header.appendChild(title);
  header.appendChild(progress);

  return header;
}

function createBoardSection() {
  const section = document.createElement('div');
  section.className = 'xq-daily-board-section';

  // Puzzle info
  const info = document.createElement('div');
  info.className = 'xq-daily-info';

  const title = document.createElement('h2');
  title.className = 'xq-puzzle-title';
  title.textContent = currentPuzzle.title;

  const meta = document.createElement('div');
  meta.className = 'xq-puzzle-meta';
  meta.innerHTML = `
    <span class="xq-puzzle-opening">${currentPuzzle.opening}</span>
    <span class="xq-puzzle-rating">Rating: ${currentPuzzle.rating}</span>
    <span class="xq-puzzle-theme">${currentPuzzle.theme}</span>
  `;

  const explanation = document.createElement('p');
  explanation.className = 'xq-puzzle-explanation';
  explanation.textContent = currentPuzzle.explanation_en; // TODO: support language toggle

  info.appendChild(title);
  info.appendChild(meta);
  info.appendChild(explanation);

  // Board visualization
  const boardContainer = document.createElement('div');
  boardContainer.className = 'xq-daily-board-container';
  boardContainer.id = 'xq-daily-board';

  renderBoard(boardContainer);

  // Move input and controls
  const inputArea = document.createElement('div');
  inputArea.className = 'xq-daily-input-area';

  const moveInput = document.createElement('input');
  moveInput.type = 'text';
  moveInput.className = 'xq-move-input';
  moveInput.placeholder = t('enter_move');
  moveInput.id = 'xq-move-input';

  moveInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleMoveInput(moveInput.value, moveInput);
    }
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'xq-btn-submit';
  submitBtn.textContent = t('submit_move');
  submitBtn.onclick = () => handleMoveInput(moveInput.value, moveInput);

  inputArea.appendChild(moveInput);
  inputArea.appendChild(submitBtn);

  section.appendChild(info);
  section.appendChild(boardContainer);
  section.appendChild(inputArea);

  return section;
}

function createControls() {
  const controls = document.createElement('div');
  controls.className = 'xq-daily-controls';

  // Hint button
  const hintBtn = document.createElement('button');
  hintBtn.className = 'xq-btn-hint';
  hintBtn.innerHTML = '💡 ' + t('hint');
  hintBtn.onclick = showHint;

  // Skip button
  const skipBtn = document.createElement('button');
  skipBtn.className = 'xq-btn-skip';
  skipBtn.innerHTML = '↺ ' + t('skip');
  skipBtn.onclick = showSkipDialog;

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'xq-btn-reset';
  resetBtn.innerHTML = '🔁 ' + t('reset');
  resetBtn.onclick = resetPuzzle;

  // Home button
  const homeBtn = document.createElement('button');
  homeBtn.className = 'xq-btn-home';
  homeBtn.innerHTML = '🏠 ' + t('home');
  homeBtn.onclick = () => window.location.hash = '#/';

  controls.appendChild(hintBtn);
  controls.appendChild(skipBtn);
  controls.appendChild(resetBtn);
  controls.appendChild(homeBtn);

  return controls;
}

function renderBoard(container) {
  container.innerHTML = '';

  const board = document.createElement('div');
  board.className = 'xq-chess-board';

  // Render 8x8 board
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const square = document.createElement('div');
      const squareName = String.fromCharCode(97 + file) + (rank + 1);
      square.className = 'xq-square ' + ((rank + file) % 2 === 0 ? 'light' : 'dark');
      square.dataset.square = squareName;

      // Add piece if exists
      const piece = currentBoard.squares[rank * 8 + file];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = 'xq-piece ' + getPieceClass(piece);
        pieceEl.textContent = getPieceSymbol(piece);
        square.appendChild(pieceEl);
      }

      square.onclick = () => selectSquare(square, squareName);
      board.appendChild(square);
    }
  }

  container.appendChild(board);
}

function getPieceClass(piece) {
  const classes = {
    'K': 'king-w', 'Q': 'queen-w', 'R': 'rook-w', 'B': 'bishop-w', 'N': 'knight-w', 'P': 'pawn-w',
    'k': 'king-b', 'q': 'queen-b', 'r': 'rook-b', 'b': 'bishop-b', 'n': 'knight-b', 'p': 'pawn-b'
  };
  return classes[piece] || '';
}

function getPieceSymbol(piece) {
  const symbols = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };
  return symbols[piece] || '';
}

function selectSquare(squareEl, squareName) {
  // Deselect all
  document.querySelectorAll('.xq-square.selected').forEach(s => s.classList.remove('selected'));
  squareEl.classList.add('selected');
}

function handleMoveInput(moveStr, inputEl) {
  if (!moveStr.trim()) return;

  // Parse move (e.g., "e2e4" or "e4")
  const move = parseMove(moveStr.trim().toLowerCase());
  if (!move) {
    toast('Invalid move format');
    return;
  }

  // Validate move is legal
  if (!isValidMove(currentBoard, move)) {
    toast('Illegal move');
    return;
  }

  // Apply move
  applyMove(currentBoard, move);
  moveHistory.push(move);
  inputEl.value = '';

  // Refresh board
  renderBoard(document.getElementById('xq-daily-board'));

  // Check if move is correct (is it the next move in solution?)
  const nextSolutionMove = currentPuzzle.solution[moveHistory.length - 1];
  if (moveToString(move) === nextSolutionMove) {
    // Correct move
    if (moveHistory.length === currentPuzzle.solution.length) {
      // Puzzle solved!
      showSuccess();
    } else {
      toast('Correct! Continue...');
    }
  } else {
    // Wrong move
    showWrong(nextSolutionMove);
  }
}

function parseMove(moveStr) {
  // Support "e2e4" format
  if (moveStr.length === 4) {
    const fromSquare = moveStr.substring(0, 2);
    const toSquare = moveStr.substring(2, 4);
    const from = (8 - parseInt(fromSquare[1])) * 8 + (fromSquare.charCodeAt(0) - 97);
    const to = (8 - parseInt(toSquare[1])) * 8 + (toSquare.charCodeAt(0) - 97);
    return { from, to, promotion: '' };
  }
  return null;
}

function moveToString(move) {
  const fromFile = String.fromCharCode(97 + (move.from % 8));
  const fromRank = 8 - Math.floor(move.from / 8);
  const toFile = String.fromCharCode(97 + (move.to % 8));
  const toRank = 8 - Math.floor(move.to / 8);
  return fromFile + fromRank + toFile + toRank;
}

function showHint() {
  if (hintShown) {
    toast(t('hint_already_shown'));
    return;
  }

  hintShown = true;
  const nextMove = currentPuzzle.solution[moveHistory.length];
  if (nextMove) {
    toast(`Hint: Next move is ${nextMove}`);

    // Highlight the hint
    const hintText = document.querySelector('.xq-move-input');
    if (hintText) {
      hintText.placeholder = `Hint: ${nextMove}`;
      hintText.style.color = '#FFD700';
    }
  }
}

function showSkipDialog() {
  const confirmed = confirm(t('confirm_skip'));
  if (confirmed) {
    skipPuzzle(currentPuzzle.id);
    toast(t('puzzle_skipped'));
    // Reload for next puzzle
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}

function resetPuzzle() {
  currentBoard = new Board();
  fromFEN(currentBoard, currentPuzzle.fen);
  moveHistory = [];
  hintShown = false;
  document.getElementById('xq-move-input').value = '';
  renderBoard(document.getElementById('xq-daily-board'));
  toast(t('puzzle_reset'));
}

function showSuccess() {
  const elapsedTime = Date.now() - puzzleStartTime;
  completePuzzle(currentPuzzle.id, hintShown, elapsedTime);

  // Create result dialog
  const dialog = document.createElement('div');
  dialog.className = 'xq-result-dialog success';

  const title = document.createElement('h2');
  title.textContent = '✓ ' + t('puzzle_solved');

  const message = document.createElement('p');
  message.textContent = t('well_done');

  const timeText = document.createElement('p');
  timeText.className = 'xq-result-time';
  timeText.textContent = `Time: ${(elapsedTime / 1000).toFixed(1)}s`;

  const hintText = document.createElement('p');
  if (hintShown) {
    hintText.textContent = `(Used hint)`;
    hintText.className = 'xq-result-hint-used';
  }

  // Show analysis
  const analysis = document.createElement('div');
  analysis.className = 'xq-result-analysis';
  analysis.innerHTML = '<h3>Analysis:</h3>';
  currentPuzzle.analysis.forEach(step => {
    const stepEl = document.createElement('div');
    stepEl.className = 'xq-analysis-step';
    stepEl.innerHTML = `<strong>${step.move}</strong>: ${step.text_en}`;
    analysis.appendChild(stepEl);
  });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'xq-btn-next';
  nextBtn.textContent = t('next_puzzle');
  nextBtn.onclick = () => {
    window.location.reload();
  };

  dialog.appendChild(title);
  dialog.appendChild(message);
  if (hintShown) dialog.appendChild(hintText);
  dialog.appendChild(timeText);
  dialog.appendChild(analysis);
  dialog.appendChild(nextBtn);

  showDialog(dialog);
}

function showWrong(correctMove) {
  // Undo the wrong move
  undoMove(currentBoard);
  moveHistory.pop();
  renderBoard(document.getElementById('xq-daily-board'));

  const dialog = document.createElement('div');
  dialog.className = 'xq-result-dialog wrong';

  const title = document.createElement('h2');
  title.textContent = '✗ ' + t('wrong_move');

  const message = document.createElement('p');
  message.textContent = `${t('correct_move_is')} ${correctMove}`;

  const retryBtn = document.createElement('button');
  retryBtn.className = 'xq-btn-retry';
  retryBtn.textContent = t('try_again');
  retryBtn.onclick = () => closeDialog();

  dialog.appendChild(title);
  dialog.appendChild(message);
  dialog.appendChild(retryBtn);

  showDialog(dialog);
}

function showDialog(dialog) {
  const overlay = document.createElement('div');
  overlay.className = 'xq-dialog-overlay';
  overlay.onclick = (e) => {
    if (e.target === overlay) closeDialog();
  };

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  window.closeDialog = () => {
    overlay.remove();
  };
}

function getDailyChessStyles() {
  return `
    .xq-daily-page {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .xq-daily-header {
      padding: 20px;
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .xq-daily-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .xq-daily-progress {
      display: flex;
      gap: 30px;
      font-size: 16px;
      font-weight: 500;
    }

    .xq-streak-value, .xq-level-value {
      color: #667eea;
      font-weight: 700;
      font-size: 18px;
    }

    .xq-daily-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .xq-daily-board-section {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .xq-daily-info {
      margin-bottom: 20px;
    }

    .xq-puzzle-title {
      margin: 0 0 10px 0;
      font-size: 20px;
      color: #333;
    }

    .xq-puzzle-meta {
      display: flex;
      gap: 15px;
      margin-bottom: 10px;
      font-size: 13px;
    }

    .xq-puzzle-opening, .xq-puzzle-rating, .xq-puzzle-theme {
      background: #f0f0f0;
      padding: 4px 8px;
      border-radius: 4px;
      color: #666;
    }

    .xq-puzzle-explanation {
      margin: 10px 0 0 0;
      color: #555;
      line-height: 1.5;
    }

    .xq-daily-board-container {
      margin: 20px 0;
      display: flex;
      justify-content: center;
    }

    .xq-chess-board {
      display: grid;
      grid-template-columns: repeat(8, 60px);
      grid-template-rows: repeat(8, 60px);
      gap: 0;
      border: 2px solid #333;
      background: #8B7355;
    }

    .xq-square {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 40px;
      position: relative;
    }

    .xq-square.light {
      background: #F0D9B5;
    }

    .xq-square.dark {
      background: #B58863;
    }

    .xq-square.selected {
      background: #BACA44 !important;
    }

    .xq-piece {
      user-select: none;
      line-height: 1;
    }

    .xq-daily-input-area {
      display: flex;
      gap: 10px;
      margin: 20px 0;
    }

    .xq-move-input {
      flex: 1;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 500;
      transition: border-color 0.2s;
    }

    .xq-move-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .xq-btn-submit {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .xq-btn-submit:hover {
      background: #5568d3;
    }

    .xq-daily-controls {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .xq-daily-controls button {
      flex: 1;
      min-width: 120px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid #667eea;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #667eea;
      cursor: pointer;
      transition: all 0.2s;
    }

    .xq-daily-controls button:hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
    }

    .xq-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .xq-result-dialog {
      background: white;
      border-radius: 12px;
      padding: 30px;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
    }

    .xq-result-dialog h2 {
      margin: 0 0 15px 0;
      font-size: 24px;
    }

    .xq-result-dialog.success h2 {
      color: #27ae60;
    }

    .xq-result-dialog.wrong h2 {
      color: #e74c3c;
    }

    .xq-result-analysis {
      text-align: left;
      background: #f8f8f8;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }

    .xq-analysis-step {
      padding: 8px 0;
      font-size: 14px;
      border-bottom: 1px solid #e0e0e0;
    }

    .xq-analysis-step:last-child {
      border-bottom: none;
    }

    .xq-result-time {
      color: #666;
      font-size: 14px;
    }

    .xq-result-hint-used {
      color: #f39c12;
      font-size: 12px;
      font-style: italic;
    }

    .xq-btn-next, .xq-btn-retry {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 15px;
      transition: background 0.2s;
    }

    .xq-btn-next:hover, .xq-btn-retry:hover {
      background: #5568d3;
    }

    .xq-daily-error {
      text-align: center;
      padding: 40px;
      color: white;
      font-size: 18px;
    }

    @media (max-width: 768px) {
      .xq-chess-board {
        grid-template-columns: repeat(8, 40px);
        grid-template-rows: repeat(8, 40px);
      }

      .xq-square {
        width: 40px;
        height: 40px;
        font-size: 28px;
      }

      .xq-daily-controls {
        flex-direction: column;
      }

      .xq-daily-controls button {
        min-width: auto;
      }

      .xq-daily-progress {
        flex-direction: column;
        gap: 8px;
      }
    }
  `;
}
