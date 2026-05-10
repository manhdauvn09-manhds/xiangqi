// Tournament Management System
// Handles tournament creation, brackets, rounds, and results

export const TOURNAMENT_STATUS = {
  CREATED: 'created',
  REGISTRATION: 'registration',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
};

export const TOURNAMENT_FORMAT = {
  ROUND_ROBIN: 'round_robin',
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
};

export class Tournament {
  constructor(config = {}) {
    this.id = config.id || `tournament_${Date.now()}`;
    this.name = config.name || 'Unnamed Tournament';
    this.format = config.format || TOURNAMENT_FORMAT.ROUND_ROBIN;
    this.status = TOURNAMENT_STATUS.CREATED;
    this.maxPlayers = config.maxPlayers || 8;
    this.timeControl = config.timeControl || '10+5';
    this.variant = config.variant || 'standard';
    this.startTime = config.startTime || null;
    this.endTime = null;
    this.players = [];
    this.rounds = [];
    this.results = [];
    this.standings = [];
  }

  /**
   * Add a player to the tournament
   */
  addPlayer(player) {
    if (this.status !== TOURNAMENT_STATUS.REGISTRATION && this.status !== TOURNAMENT_STATUS.CREATED) {
      throw new Error('Cannot add players after registration');
    }
    if (this.players.length >= this.maxPlayers) {
      throw new Error('Tournament is full');
    }
    if (this.players.find(p => p.id === player.id)) {
      throw new Error('Player already in tournament');
    }
    this.players.push({
      id: player.id,
      name: player.name,
      elo: player.elo,
      joinedAt: Date.now(),
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
    });
  }

  /**
   * Remove a player from the tournament
   */
  removePlayer(playerId) {
    if (this.status === TOURNAMENT_STATUS.IN_PROGRESS) {
      throw new Error('Cannot remove players after tournament starts');
    }
    this.players = this.players.filter(p => p.id !== playerId);
  }

  /**
   * Start the tournament
   */
  start() {
    if (this.status !== TOURNAMENT_STATUS.REGISTRATION && this.status !== TOURNAMENT_STATUS.CREATED) {
      throw new Error('Tournament already started or completed');
    }
    if (this.players.length < 2) {
      throw new Error('Need at least 2 players');
    }
    this.status = TOURNAMENT_STATUS.IN_PROGRESS;
    this.startTime = Date.now();
    this._generateRounds();
  }

  /**
   * Generate rounds based on tournament format
   */
  _generateRounds() {
    if (this.format === TOURNAMENT_FORMAT.ROUND_ROBIN) {
      this._generateRoundRobin();
    } else if (this.format === TOURNAMENT_FORMAT.SINGLE_ELIMINATION) {
      this._generateSingleElimination();
    } else if (this.format === TOURNAMENT_FORMAT.DOUBLE_ELIMINATION) {
      this._generateDoubleElimination();
    }
  }

  /**
   * Generate round-robin matches (everyone plays everyone)
   */
  _generateRoundRobin() {
    const matches = [];
    const players = this.players;
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        matches.push({
          id: `match_${Date.now()}_${Math.random()}`,
          player1: players[i].id,
          player2: players[j].id,
          status: 'pending',
          result: null,
        });
      }
    }
    this.rounds.push({ roundNumber: 1, matches });
  }

  /**
   * Generate single elimination bracket
   */
  _generateSingleElimination() {
    const matches = [];
    const players = [...this.players].sort(() => Math.random() - 0.5); // Randomize bracket
    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 < players.length) {
        matches.push({
          id: `match_${Date.now()}_${Math.random()}`,
          player1: players[i].id,
          player2: players[i + 1].id,
          status: 'pending',
          result: null,
        });
      } else {
        // Bye round for odd number of players
        matches.push({
          id: `match_${Date.now()}_${Math.random()}`,
          player1: players[i].id,
          player2: null,
          status: 'bye',
          result: players[i].id,
        });
      }
    }
    this.rounds.push({ roundNumber: 1, matches });
  }

  /**
   * Generate double elimination bracket
   */
  _generateDoubleElimination() {
    // TODO: Implement double elimination bracket generation
    this._generateSingleElimination();
  }

  /**
   * Record a match result
   */
  recordResult(roundNumber, matchId, winnerId, loserElo = null) {
    const round = this.rounds.find(r => r.roundNumber === roundNumber);
    if (!round) throw new Error('Round not found');

    const match = round.matches.find(m => m.id === matchId);
    if (!match) throw new Error('Match not found');

    match.status = 'completed';
    match.result = winnerId;

    const winner = this.players.find(p => p.id === winnerId);
    const loser = match.player1 === winnerId ?
      this.players.find(p => p.id === match.player2) :
      this.players.find(p => p.id === match.player1);

    if (winner) {
      winner.wins += 1;
      winner.points += 1;
    }
    if (loser) {
      loser.losses += 1;
    }

    this._updateStandings();
  }

  /**
   * Record a draw
   */
  recordDraw(roundNumber, matchId) {
    const round = this.rounds.find(r => r.roundNumber === roundNumber);
    if (!round) throw new Error('Round not found');

    const match = round.matches.find(m => m.id === matchId);
    if (!match) throw new Error('Match not found');

    match.status = 'completed';
    match.result = 'draw';

    const player1 = this.players.find(p => p.id === match.player1);
    const player2 = this.players.find(p => p.id === match.player2);

    if (player1) {
      player1.draws += 1;
      player1.points += 0.5;
    }
    if (player2) {
      player2.draws += 1;
      player2.points += 0.5;
    }

    this._updateStandings();
  }

  /**
   * Update tournament standings
   */
  _updateStandings() {
    this.standings = [...this.players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.wins - a.wins;
    });
  }

  /**
   * Check if tournament is finished
   */
  isFinished() {
    return this.rounds.every(round =>
      round.matches.every(match => match.status === 'completed' || match.status === 'bye')
    );
  }

  /**
   * Complete the tournament
   */
  complete() {
    if (!this.isFinished()) {
      throw new Error('Tournament not finished');
    }
    this.status = TOURNAMENT_STATUS.COMPLETED;
    this.endTime = Date.now();
  }

  /**
   * Get tournament standings
   */
  getStandings() {
    return this.standings;
  }

  /**
   * Get next matches
   */
  getNextMatches() {
    for (const round of this.rounds) {
      const pendingMatches = round.matches.filter(m => m.status === 'pending');
      if (pendingMatches.length > 0) {
        return {
          roundNumber: round.roundNumber,
          matches: pendingMatches,
        };
      }
    }
    return null;
  }
}

/**
 * Global tournament manager
 */
export const tournamentManager = {
  tournaments: new Map(),

  /**
   * Create a new tournament
   */
  createTournament(config) {
    const tournament = new Tournament(config);
    this.tournaments.set(tournament.id, tournament);
    return tournament;
  },

  /**
   * Get a tournament by ID
   */
  getTournament(id) {
    return this.tournaments.get(id);
  },

  /**
   * List all active tournaments
   */
  getActiveTournaments() {
    return Array.from(this.tournaments.values()).filter(t =>
      t.status === TOURNAMENT_STATUS.IN_PROGRESS ||
      t.status === TOURNAMENT_STATUS.REGISTRATION
    );
  },

  /**
   * Delete a tournament
   */
  deleteTournament(id) {
    this.tournaments.delete(id);
  },
};

export default tournamentManager;
