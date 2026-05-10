// Fake Players System - AI opponents for online queue
// 30 bots per difficulty level with random names and realistic behavior

const FIRST_NAME_PARTS = [
  'Cao', 'Đặng', 'Dương', 'Đoàn', 'Đinh', 'Đỗ',
  'Hà', 'Hoàng', 'Hồ', 'Huỳnh',
  'Khuất', 'Khương',
  'Lâm', 'Lê', 'Lý',
  'Mã', 'Mai', 'Mạc',
  'Nguyễn', 'Nước', 'Nhi',
  'Ông', 'Ốc',
  'Phan', 'Phạm', 'Phạn', 'Phó', 'Phùng',
  'Quách', 'Quảng', 'Quản', 'Quế', 'Quỳnh',
  'Rạch',
  'Sài',
  'Tạ', 'Tài', 'Tân', 'Tấn', 'Tập', 'Tế', 'Thi', 'Thiền',
  'Tô', 'Tống', 'Tường',
  'Uyên', 'Ứng',
  'Vạn', 'Văn', 'Vàng', 'Võ', 'Vũ', 'Vương',
  'Xưa',
  'Yên',
  'Zhu', 'Zinh'
];

const LAST_NAME_PARTS = [
  'An', 'Anh',
  'Bảo', 'Bình',
  'Cảnh', 'Chiến', 'Công', 'Cường',
  'Dạ', 'Đại', 'Đan', 'Đặc', 'Dũng', 'Duy',
  'Đức',
  'Giang',
  'Hạnh', 'Hạo', 'Hiên', 'Hiệp', 'Hoàn', 'Hội', 'Hùng', 'Huy',
  'Hương',
  'Khang', 'Khánh', 'Khiêm', 'Khoa', 'Khoát',
  'Liên', 'Linh', 'Lộc', 'Lợi',
  'Mạnh', 'Mầu', 'Mệnh', 'Minh', 'Mộc',
  'Nhi', 'Nhân', 'Nhật', 'Nhuận', 'Nhức',
  'Oanh',
  'Phát', 'Phát', 'Phiêu', 'Phong', 'Phú', 'Phúc', 'Phương',
  'Quân', 'Quân', 'Quất', 'Quế', 'Quốc',
  'Rộng', 'Rực',
  'Sáng', 'Sâm', 'Sơn',
  'Tâm', 'Tấm', 'Tấy', 'Tề', 'Thiệm', 'Thịnh', 'Thọ', 'Thục', 'Thúc',
  'Thúy',
  'Thuận', 'Thuận', 'Thuỷ',
  'Tích', 'Tiến', 'Tĩnh', 'Toàn', 'Tuyên', 'Tuyền',
  'Uyển',
  'Vận', 'Văn', 'Vệ', 'Việt', 'Vĩ', 'Vinh', 'Vũ', 'Vương',
  'Xạn',
  'Yên',
  'Yết',
  'Zâu', 'Zía'
];

export const DIFFICULTY_LEVELS = {
  BEGINNER: 1,
  NOVICE: 2,
  INTERMEDIATE: 3,
  SKILLED: 4,
  STRONG: 5,
  MASTER: 6,
  GRANDMASTER: 7,
  SAGE: 8,
  SUPERAI: 9,
  LEGENDARY: 10,
};

export const DIFFICULTY_NAMES = {
  1: 'Apprentice',
  2: 'Novice',
  3: 'Beginner',
  4: 'Intermediate',
  5: 'Skilled',
  6: 'Strong',
  7: 'Master',
  8: 'Grandmaster',
  9: 'Sage',
  10: 'Super AI',
};

const DIFFICULTY_ELO = {
  1: 1200,
  2: 1350,
  3: 1500,
  4: 1650,
  5: 1800,
  6: 1950,
  7: 2100,
  8: 2250,
  9: 2400,
  10: 2550,
};

/**
 * Generate a random Vietnamese-sounding name
 */
function generateRandomName() {
  const firstIdx = Math.floor(Math.random() * FIRST_NAME_PARTS.length);
  const lastIdx = Math.floor(Math.random() * LAST_NAME_PARTS.length);
  const first = FIRST_NAME_PARTS[firstIdx];
  const last = LAST_NAME_PARTS[lastIdx];
  return `${first} ${last}`;
}

/**
 * Calculate move delay based on difficulty level
 * Higher levels think longer for more complex positions
 */
function getMoveThinksTimeMs(difficulty) {
  const baseDelay = 500;
  const delayPerLevel = 200;
  return baseDelay + difficulty * delayPerLevel;
}

/**
 * Create a fake player object
 */
function createFakePlayer(difficulty, seed = null) {
  if (!DIFFICULTY_NAMES[difficulty]) {
    throw new Error(`Invalid difficulty level: ${difficulty}`);
  }

  // Use seed for deterministic name generation if provided
  if (seed !== null) {
    const random = Math.sin(seed * 12.9898) % 1;
    const firstIdx = Math.floor(random * FIRST_NAME_PARTS.length);
    const lastIdx = Math.floor((random * 0.7331) * LAST_NAME_PARTS.length);
    const first = FIRST_NAME_PARTS[firstIdx];
    const last = LAST_NAME_PARTS[lastIdx];
    var name = `${first} ${last}`;
  } else {
    var name = generateRandomName();
  }

  return {
    id: `bot_${difficulty}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name,
    difficulty: difficulty,
    level: DIFFICULTY_NAMES[difficulty],
    elo: DIFFICULTY_ELO[difficulty],
    isFakePlayer: true,
    moves: 0,
    wins: Math.floor(Math.random() * 1000),
    losses: Math.floor(Math.random() * 800),
    draws: Math.floor(Math.random() * 200),
    moveThinkTimeMs: getMoveThinksTimeMs(difficulty),
  };
}

/**
 * Generate a pool of fake players for a difficulty level
 * Creates 30 unique bots per level
 */
function generateFakePlayerPool(difficulty, count = 30) {
  const pool = [];
  for (let i = 0; i < count; i++) {
    pool.push(createFakePlayer(difficulty, difficulty * 1000 + i));
  }
  return pool;
}

/**
 * Get a random fake player from a difficulty level
 */
export function getRandomFakePlayer(difficulty) {
  if (!DIFFICULTY_NAMES[difficulty]) {
    throw new Error(`Invalid difficulty level: ${difficulty}`);
  }
  const seed = difficulty * 10000 + Math.floor(Math.random() * 30);
  return createFakePlayer(difficulty, seed);
}

/**
 * Fake Player Manager - handles online queue with bot integration
 */
export class FakePlayerManager {
  constructor() {
    this.playerPools = {};
    this.activeGames = new Map(); // gameId -> fakePlayer
    this.initializePools();
  }

  /**
   * Initialize fake player pools for all difficulty levels
   */
  initializePools() {
    for (const difficulty of Object.values(DIFFICULTY_LEVELS)) {
      this.playerPools[difficulty] = generateFakePlayerPool(difficulty, 30);
    }
  }

  /**
   * Get next available fake player for a difficulty
   */
  getPlayerForGame(difficulty, gameId) {
    if (!this.playerPools[difficulty]) {
      throw new Error(`No players available for difficulty: ${difficulty}`);
    }

    const player = getRandomFakePlayer(difficulty);
    this.activeGames.set(gameId, player);
    return player;
  }

  /**
   * Release a fake player from an active game
   */
  releasePlayer(gameId) {
    this.activeGames.delete(gameId);
  }

  /**
   * Make a fake player's move with realistic timing
   * Returns move after thinking delay
   */
  async makeMove(gameId, gameState, availableMoves) {
    const player = this.activeGames.get(gameId);
    if (!player) {
      throw new Error(`No active fake player for game: ${gameId}`);
    }

    // Simulate thinking time based on difficulty
    await new Promise(resolve => setTimeout(resolve, player.moveThinkTimeMs));

    // Simple strategy: pick random legal move
    // (Real implementation would use chess engine)
    if (!availableMoves || availableMoves.length === 0) {
      throw new Error('No available moves for fake player');
    }

    const moveIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[moveIndex];
  }

  /**
   * Check if a game is against a fake player
   */
  isFakePlayerGame(gameId) {
    return this.activeGames.has(gameId);
  }

  /**
   * Get fake player stats for a difficulty level
   */
  getPoolStats(difficulty) {
    const pool = this.playerPools[difficulty];
    if (!pool) {
      return null;
    }

    const totalWins = pool.reduce((sum, p) => sum + p.wins, 0);
    const totalLosses = pool.reduce((sum, p) => sum + p.losses, 0);
    const totalDraws = pool.reduce((sum, p) => sum + p.draws, 0);

    return {
      difficulty,
      level: DIFFICULTY_NAMES[difficulty],
      totalBots: pool.length,
      averageElo: pool[0].elo,
      combinedWins: totalWins,
      combinedLosses: totalLosses,
      combinedDraws: totalDraws,
    };
  }

  /**
   * Get all available difficulty levels
   */
  getAvailableLevels() {
    return Object.entries(DIFFICULTY_LEVELS).map(([name, level]) => ({
      level,
      name: DIFFICULTY_NAMES[level],
      elo: DIFFICULTY_ELO[level],
    }));
  }
}

/**
 * Global fake player manager instance
 */
export const fakePlayerManager = new FakePlayerManager();

export default FakePlayerManager;
