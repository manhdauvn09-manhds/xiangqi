// Daily Chess Puzzles - Training Mode
// Fetched from famous chess positions and puzzles
// Format: FEN + solution moves (UCI) + step-by-step analysis

export const CHESS_PUZZLES = [
  {
    "id": "puzzle_001",
    "title": "Italian: Two Knights - Fried Liver",
    "fen": "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
    "solution": ["Bxc6", "dxc6", "Nxe5"],
    "rating": 1200,
    "theme": "tactics,attack",
    "opening": "Italian Game",
    "explanation_en": "The bishop captures on c6, forcing the pawn to recapture. Then the knight takes on e5 with a strong attack on the undefended king.",
    "explanation_vi": "Tịch ăn quân mã trên c6, bắt buộc tốt phải lấy. Sau đó quân mã ăn tốt e5 với một tấn công mạnh lên vua không được bảo vệ.",
    "analysis": [
      {"step": 1, "move": "Bxc6", "text_en": "Bishop takes knight", "text_vi": "Tịch ăn quân mã"},
      {"step": 2, "move": "dxc6", "text_en": "Forced recapture", "text_vi": "Lấy tốt bắt buộc"},
      {"step": 3, "move": "Nxe5", "text_en": "Knight attacks undefended pawn and eyes d7", "text_vi": "Quân mã tấn công tốt e5 và hướng tới d7"}
    ]
  },
  {
    "id": "puzzle_002",
    "title": "Back Rank Mate - Queen and Rook",
    "fen": "6k1/5ppp/8/8/8/8/R1Q4K w - - 0 1",
    "solution": ["Qc8", "Kg7", "Qg8"],
    "rating": 1100,
    "theme": "mate,backrank",
    "opening": "Endgame",
    "explanation_en": "Queen moves to c8 with checkmate threat. After king moves to g7, Queen delivers mate on g8.",
    "explanation_vi": "Hậu đến c8 đe dọa chiếu hết. Sau khi vua đi đến g7, Hậu chiếu hết trên g8.",
    "analysis": [
      {"step": 1, "move": "Qc8", "text_en": "Queen controls back rank", "text_vi": "Hậu kiểm soát hàng cuối"},
      {"step": 2, "move": "Kg7", "text_en": "Forced king move", "text_vi": "Vua bắt buộc phải di chuyển"},
      {"step": 3, "move": "Qg8", "text_en": "Checkmate!", "text_vi": "Chiếu hết!"}
    ]
  },
  {
    "id": "puzzle_003",
    "title": "Greek Gift Sacrifice",
    "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
    "solution": ["Bxh7", "Kxh7", "Ng5"],
    "rating": 1300,
    "theme": "sacrifice,attack,brilliancy",
    "opening": "Italian Game",
    "explanation_en": "The classic bishop sacrifice on h7, forcing the king out and allowing a devastating knight fork with check.",
    "explanation_vi": "Sự hy sinh tịch cổ điển trên h7, buộc vua phải ra ngoài và cho phép quân mã tấn công với sự kiểm soát.",
    "analysis": [
      {"step": 1, "move": "Bxh7", "text_en": "Sacrifice the bishop!", "text_vi": "Hy sinh quân tịch!"},
      {"step": 2, "move": "Kxh7", "text_en": "Forced capture", "text_vi": "Vua bắt buộc phải ăn"},
      {"step": 3, "move": "Ng5", "text_en": "Knight fork with devastating attack", "text_vi": "Quân mã tấn công với check"}
    ]
  },
  {
    "id": "puzzle_004",
    "title": "Quiet Move Wins",
    "fen": "8/8/8/2k5/8/1K6/8/R7 w - - 0 1",
    "solution": ["Ra5", "Kd6", "Ra6"],
    "rating": 1150,
    "theme": "endgame,quiet",
    "opening": "Rook Endgame",
    "explanation_en": "A subtle quiet move that cuts off the king's escape squares, leading to checkmate in a few moves.",
    "explanation_vi": "Một nước lặng lẽ tinh tế cắt đứt các ô thoát của vua, dẫn đến chiếu hết trong vài nước.",
    "analysis": [
      {"step": 1, "move": "Ra5", "text_en": "Quiet but strong", "text_vi": "Lặng nhưng mạnh mẽ"},
      {"step": 2, "move": "Kd6", "text_en": "King tries to escape", "text_vi": "Vua cố gắng thoát"},
      {"step": 3, "move": "Ra6", "text_en": "Building the net", "text_vi": "Xây dựng bẫy"}
    ]
  },
  {
    "id": "puzzle_005",
    "title": "Pinned Piece Tactics",
    "fen": "r2qkb1r/pp1b1ppp/2n1pn2/3p4/2BPP3/2N1BP2/PPP2PPP/R2QK2R w KQkq - 0 1",
    "solution": ["Bxf7", "Kxf7", "Nd5"],
    "rating": 1400,
    "theme": "pin,tactics,attack",
    "opening": "Caro-Kann Defense",
    "explanation_en": "The bishop on f7 is attacked but also pinning the knight. White sacrifices it to win material.",
    "explanation_vi": "Tịch trên f7 bị tấn công nhưng cũng ghìm quân mã. Trắng hy sinh nó để thắng quân.",
    "analysis": [
      {"step": 1, "move": "Bxf7", "text_en": "Sacrifice with purpose", "text_vi": "Hy sinh có mục đích"},
      {"step": 2, "move": "Kxf7", "text_en": "Forced king capture", "text_vi": "Vua bắt buộc ăn"},
      {"step": 3, "move": "Nd5", "text_en": "Fork wins material", "text_vi": "Quân mã tấn công thắng quân"}
    ]
  }
];

/**
 * Get today's puzzle based on date seed
 * @param {Date} date
 * @returns {Object} puzzle with metadata
 */
export function getDailyChessPuzzle(date = new Date()) {
  if (!CHESS_PUZZLES.length) {
    console.error('No chess puzzles loaded');
    return null;
  }

  const seed = parseInt(
    `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`,
    10
  );

  const idx = seed % CHESS_PUZZLES.length;
  const puzzle = CHESS_PUZZLES[idx];

  return {
    ...puzzle,
    dateKey: dateKey(date),
    level: Math.floor((seed % 100) / 5) + 1, // Level 1-20 based on seed
  };
}

/**
 * Get skipped puzzles from localStorage
 */
export function getSkippedPuzzles() {
  try {
    return JSON.parse(localStorage.getItem('xq_daily_skipped') || '[]');
  } catch {
    return [];
  }
}

/**
 * Save skipped puzzle for later
 */
export function skipPuzzle(puzzleId) {
  const skipped = getSkippedPuzzles();
  if (!skipped.includes(puzzleId)) {
    skipped.push(puzzleId);
    localStorage.setItem('xq_daily_skipped', JSON.stringify(skipped));
  }
}

/**
 * Get daily progress
 */
export function getDailyProgress() {
  try {
    return JSON.parse(localStorage.getItem('xq_daily_progress') || '{}');
  } catch {
    return {};
  }
}

/**
 * Save daily progress
 */
export function saveDailyProgress(progress) {
  localStorage.setItem('xq_daily_progress', JSON.stringify(progress));
}

/**
 * Get current streak (consecutive days played)
 */
export function getStreak() {
  const progress = getDailyProgress();
  let count = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);

    if (progress[key]?.completed) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

/**
 * Get current level (1-100)
 */
export function getLevel() {
  const streak = getStreak();
  return Math.min(100, Math.floor(streak / 1) + 1);
}

/**
 * Mark puzzle as completed
 */
export function completePuzzle(puzzleId, usedHint = false, timeMs = 0) {
  const progress = getDailyProgress();
  const today = dateKey(new Date());

  if (!progress[today]) {
    progress[today] = {
      completed: false,
      puzzles: [],
    };
  }

  progress[today].puzzles.push({
    id: puzzleId,
    usedHint,
    timeMs,
    completedAt: Date.now(),
  });

  progress[today].completed = true;

  saveDailyProgress(progress);
}

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
