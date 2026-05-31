// Cờ Tướng Vương — AI Web Worker
import { fromFEN } from '../core/board.js';
import { searchBestMove, searchTopMoves, randomMove, greedyCaptureMove } from './search.js';
import { findBookMove } from './openings.js';
import { iccsToMove } from '../core/notation.js';

// Cấu hình theo level (Enhanced — 2x stronger)
const LEVEL_CONFIG = {
  1:  { algo: 'random',  depth: 1, time: 100,  useTT: false, useBook: false, enhancedEval: false },
  2:  { algo: 'greedy',  depth: 1, time: 200,  useTT: false, useBook: false, enhancedEval: false },
  3:  { algo: 'minimax', depth: 3, time: 500,  useTT: false, useBook: false, enhancedEval: false },
  4:  { algo: 'minimax', depth: 4, time: 800,  useTT: true,  useBook: false, enhancedEval: false },
  5:  { algo: 'minimax', depth: 4, time: 1200, useTT: true,  useBook: false, enhancedEval: false },
  6:  { algo: 'minimax', depth: 5, time: 2000, useTT: true,  useBook: false, enhancedEval: false },
  7:  { algo: 'minimax', depth: 5, time: 2500, useTT: true,  useBook: true,  enhancedEval: false },
  8:  { algo: 'minimax', depth: 6, time: 5000, useTT: true,  useBook: true,  enhancedEval: true  }, // Enhanced eval
  9:  { algo: 'minimax', depth: 7, time: 7000, useTT: true,  useBook: true,  enhancedEval: true  }, // depth 6→7, enhanced eval
  10: { algo: 'minimax', depth: 8, time: 12000, useTT: true, useBook: true,  enhancedEval: true }, // depth 6→8, enhanced eval, more time
};

self.addEventListener('message', (e) => {
  const msg = e.data || {};
  if (msg.cmd === 'search') {
    try {
      const cfg = LEVEL_CONFIG[msg.level] || LEVEL_CONFIG[3];
      const board = fromFEN(msg.fen);

      // Opening book (lv 7+)
      if (cfg.useBook && Array.isArray(msg.iccsHistory)) {
        const bookICCS = findBookMove(msg.iccsHistory);
        if (bookICCS) {
          const move = iccsToMove(bookICCS);
          if (move) {
            self.postMessage({ type: 'result', move, score: 0, depth: 0, nodes: 0, ms: 0, source: 'book' });
            return;
          }
        }
      }

      let result;
      if (cfg.algo === 'random') {
        result = { move: randomMove(board), score: 0, depth: 0, nodes: 0, ms: 0 };
      } else if (cfg.algo === 'greedy') {
        result = { move: greedyCaptureMove(board), score: 0, depth: 0, nodes: 0, ms: 0 };
      } else {
        result = searchBestMove(board, {
          maxDepth: cfg.depth,
          timeMs: cfg.time,
          useTT: cfg.useTT,
          enhancedEval: cfg.enhancedEval,
          level: msg.level,
          onProgress: ({ depth, score }) => self.postMessage({ type: 'progress', depth, score }),
        });
      }
      self.postMessage({ type: 'result', source: 'search', ...result });
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err && err.message || err) });
    }
  } else if (msg.cmd === 'hint') {
    try {
      const board = fromFEN(msg.fen);
      const top = searchTopMoves(board, { maxDepth: 3, topN: 3 });
      self.postMessage({ type: 'hint', moves: top });
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err && err.message || err) });
    }
  }
});
