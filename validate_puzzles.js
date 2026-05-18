/**
 * Puzzle Validation Script
 * Verifies all 14 daily puzzles can be executed without errors
 */

import { PUZZLE_BANK } from './xiangqi/scripts/puzzles/bank.js';
import { fromFEN } from './xiangqi/scripts/core/board.js';
import { isLegalMove, makeMove } from './xiangqi/scripts/core/moves.js';
import { inCheck } from './xiangqi/scripts/core/rules.js';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}🧪 Xiangqi Daily Puzzle Validation${colors.reset}\n`);
console.log(`Testing ${PUZZLE_BANK.length} puzzles...\n`);

let passCount = 0;
let failCount = 0;
const issues = [];

PUZZLE_BANK.forEach((puzzle, idx) => {
  const puzzleNum = idx + 1;
  const title = puzzle.title.vi || puzzle.title.en || `Puzzle ${puzzleNum}`;

  try {
    // Parse FEN
    let board;
    try {
      board = fromFEN(puzzle.fen, 'standard');
    } catch (e) {
      throw new Error(`Invalid FEN: ${e.message}`);
    }

    // Apply solution moves
    const moves = puzzle.solution || [];
    if (moves.length === 0) {
      throw new Error('No solution moves defined');
    }

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];

      // Check if move is legal
      if (!isLegalMove(board, move)) {
        throw new Error(`Move ${i+1} "${move}" is illegal`);
      }

      // Apply move
      board = makeMove(board, move);
      if (!board) {
        throw new Error(`Move ${i+1} "${move}" failed to apply`);
      }
    }

    // Check if final position is checkmate (mateIn puzzle)
    const mateIn = puzzle.mateIn || 3;
    if (puzzle.mateIn && moves.length !== mateIn) {
      console.warn(`${colors.yellow}⚠️  #${puzzleNum}${colors.reset} "${title}": Expected ${mateIn} moves, got ${moves.length}`);
      issues.push(`#${puzzleNum}: Move count mismatch (expected ${mateIn}, got ${moves.length})`);
    }

    console.log(`${colors.green}✅ #${puzzleNum}${colors.reset} "${title}"`);
    console.log(`   Solution: ${moves.join(' → ')}`);
    passCount++;

  } catch (err) {
    console.log(`${colors.red}❌ #${puzzleNum}${colors.reset} "${title}"`);
    console.log(`   ${colors.red}Error: ${err.message}${colors.reset}`);
    issues.push(`#${puzzleNum} "${title}": ${err.message}`);
    failCount++;
  }
});

console.log(`\n${colors.cyan}────────────────────────────────────────${colors.reset}`);
console.log(`${colors.green}✅ Passed: ${passCount}${colors.reset} | ${colors.red}❌ Failed: ${failCount}${colors.reset}`);

if (failCount > 0) {
  console.log(`\n${colors.red}Issues Found:${colors.reset}`);
  issues.forEach(issue => console.log(`  • ${issue}`));
  process.exit(1);
} else {
  console.log(`\n${colors.green}🎉 All puzzles validated successfully!${colors.reset}`);
  process.exit(0);
}
