"""Tournament system — Swiss, Knockout, Arena.

Phase 3: Full tournament lifecycle.

Swiss: N rounds, pairing by ELO proximity, tiebreak by Buchholz.
Knockout: Single elimination bracket, seeded by ELO.
Arena: Continuous play within time window, points for speed.
"""
from __future__ import annotations

import math
import random
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class TournamentFormat(str, Enum):
    SWISS = 'swiss'
    KNOCKOUT = 'knockout'
    ARENA = 'arena'


class TournamentStatus(str, Enum):
    UPCOMING = 'upcoming'
    ACTIVE = 'active'
    PAIRING = 'pairing'
    FINISHED = 'finished'
    CANCELLED = 'cancelled'


@dataclass
class TournamentPlayer:
    user_id: int
    display_name: str
    elo: int
    seed: int = 0
    score: float = 0.0
    wins: int = 0
    losses: int = 0
    draws: int = 0
    buchholz: float = 0.0       # tiebreak for Swiss
    opponents: list[int] = field(default_factory=list)
    eliminated: bool = False     # for Knockout
    bye: bool = False


@dataclass
class TournamentMatch:
    id: str
    round_num: int
    red_uid: int
    black_uid: int
    result: str | None = None    # '1-0', '0-1', '1/2-1/2'
    game_id: str | None = None
    started_at: float | None = None
    ended_at: float | None = None


@dataclass
class Tournament:
    id: str
    name: str
    format: TournamentFormat
    variant: str = 'standard'
    time_initial_ms: int = 600_000
    time_inc_ms: int = 5_000
    max_players: int = 64
    min_players: int = 4
    rounds: int = 0              # 0 = auto-calculate
    status: TournamentStatus = TournamentStatus.UPCOMING
    created_at: float = 0.0
    starts_at: float = 0.0       # scheduled start time
    ends_at: float = 0.0         # for Arena
    current_round: int = 0
    creator_id: int = 0
    players: dict[int, TournamentPlayer] = field(default_factory=dict)
    matches: list[TournamentMatch] = field(default_factory=list)
    description: str = ''


class TournamentManager:
    """In-memory tournament manager. Production would persist to DB."""

    def __init__(self):
        self.tournaments: dict[str, Tournament] = {}

    def create(self, name: str, fmt: str, creator_id: int,
               variant: str = 'standard', time_initial_ms: int = 600_000,
               time_inc_ms: int = 5_000, max_players: int = 64,
               min_players: int = 4, rounds: int = 0,
               starts_at: float = 0.0, duration_minutes: int = 120,
               description: str = '') -> Tournament:
        tid = 't_' + uuid.uuid4().hex[:12]
        now = time.time()
        fmt_enum = TournamentFormat(fmt)

        t = Tournament(
            id=tid, name=name, format=fmt_enum, variant=variant,
            time_initial_ms=time_initial_ms, time_inc_ms=time_inc_ms,
            max_players=max_players, min_players=min_players,
            rounds=rounds, status=TournamentStatus.UPCOMING,
            created_at=now, starts_at=starts_at or (now + 300),
            ends_at=(starts_at or (now + 300)) + duration_minutes * 60,
            creator_id=creator_id, description=description,
        )
        self.tournaments[tid] = t
        return t

    def join(self, tid: str, user_id: int, display_name: str, elo: int) -> bool:
        t = self.tournaments.get(tid)
        if not t or t.status != TournamentStatus.UPCOMING:
            return False
        if len(t.players) >= t.max_players:
            return False
        if user_id in t.players:
            return False
        t.players[user_id] = TournamentPlayer(
            user_id=user_id, display_name=display_name, elo=elo,
            seed=len(t.players) + 1,
        )
        return True

    def leave(self, tid: str, user_id: int) -> bool:
        t = self.tournaments.get(tid)
        if not t or t.status != TournamentStatus.UPCOMING:
            return False
        t.players.pop(user_id, None)
        return True

    def start(self, tid: str) -> bool:
        t = self.tournaments.get(tid)
        if not t or t.status != TournamentStatus.UPCOMING:
            return False
        if len(t.players) < t.min_players:
            return False

        # Auto-calculate rounds for Swiss
        if t.format == TournamentFormat.SWISS and t.rounds == 0:
            t.rounds = max(3, math.ceil(math.log2(len(t.players))))
        elif t.format == TournamentFormat.KNOCKOUT and t.rounds == 0:
            t.rounds = math.ceil(math.log2(len(t.players)))

        # Seed by ELO
        sorted_players = sorted(t.players.values(), key=lambda p: p.elo, reverse=True)
        for i, p in enumerate(sorted_players):
            p.seed = i + 1

        t.status = TournamentStatus.ACTIVE
        t.current_round = 1

        # Generate first round pairings
        self._pair_round(t)
        return True

    def report_result(self, tid: str, match_id: str, result: str,
                      game_id: str | None = None, reporter_user_id: int | None = None) -> bool:
        """Report match result. Validate reporter is participant.

        Args:
            tid: Tournament ID
            match_id: Match ID
            result: Result string ('1-0', '0-1', '1/2-1/2')
            game_id: Optional game ID to link
            reporter_user_id: User reporting the result (for validation)

        Returns:
            True if accepted, False otherwise
        """
        t = self.tournaments.get(tid)
        if not t or t.status != TournamentStatus.ACTIVE:
            return False

        match = next((m for m in t.matches if m.id == match_id), None)
        if not match or match.result is not None:
            return False

        # Verify reporter is actually in this match
        if reporter_user_id and reporter_user_id not in (match.red_uid, match.black_uid):
            logging.warning('[tournament] unauthorized report_result: tid=%s mid=%s reporter=%s',
                          tid, match_id, reporter_user_id)
            return False

        match.result = result
        match.game_id = game_id
        match.ended_at = time.time()

        # Update scores
        red = t.players.get(match.red_uid)
        black = t.players.get(match.black_uid)
        if red and black:
            if result == '1-0':
                red.score += 1.0
                red.wins += 1
                black.losses += 1
                if t.format == TournamentFormat.KNOCKOUT:
                    black.eliminated = True
            elif result == '0-1':
                black.score += 1.0
                black.wins += 1
                red.losses += 1
                if t.format == TournamentFormat.KNOCKOUT:
                    red.eliminated = True
            elif result == '1/2-1/2':
                red.score += 0.5
                red.draws += 1
                black.score += 0.5
                black.draws += 1

            red.opponents.append(match.black_uid)
            black.opponents.append(match.red_uid)

        # Check if round is complete
        round_matches = [m for m in t.matches if m.round_num == t.current_round]
        if all(m.result is not None for m in round_matches):
            self._advance_round(t)

        return True

    def _advance_round(self, t: Tournament):
        if t.current_round >= t.rounds:
            self._finish(t)
            return
        t.current_round += 1
        self._pair_round(t)

    def _pair_round(self, t: Tournament):
        if t.format == TournamentFormat.SWISS:
            self._swiss_pairing(t)
        elif t.format == TournamentFormat.KNOCKOUT:
            self._knockout_pairing(t)
        elif t.format == TournamentFormat.ARENA:
            self._arena_pairing(t)

    def _swiss_pairing(self, t: Tournament):
        """Swiss pairing: sort by score then ELO, pair neighbors, avoid rematches."""
        active = [p for p in t.players.values()]
        # Sort by score (desc), then ELO (desc) for tiebreak
        active.sort(key=lambda p: (-p.score, -p.elo))

        paired = set()
        for p in active:
            if p.user_id in paired:
                continue
            # Find best opponent (not already paired, not already played)
            for q in active:
                if q.user_id == p.user_id:
                    continue
                if q.user_id in paired:
                    continue
                if q.user_id in p.opponents:
                    continue
                # Pair them
                mid = f'm_{uuid.uuid4().hex[:8]}'
                # Alternate colors based on seed
                if (t.current_round + p.seed) % 2 == 0:
                    red_uid, black_uid = p.user_id, q.user_id
                else:
                    red_uid, black_uid = q.user_id, p.user_id
                t.matches.append(TournamentMatch(
                    id=mid, round_num=t.current_round,
                    red_uid=red_uid, black_uid=black_uid,
                    started_at=time.time(),
                ))
                paired.add(p.user_id)
                paired.add(q.user_id)
                break
            else:
                # No valid opponent found — give a bye
                if p.user_id not in paired:
                    p.bye = True
                    p.score += 1.0  # bye = win
                    paired.add(p.user_id)

    def _knockout_pairing(self, t: Tournament):
        """Single elimination bracket pairing."""
        active = [p for p in t.players.values() if not p.eliminated]
        active.sort(key=lambda p: p.seed)

        # Pair first with last seed
        paired = []
        n = len(active)
        for i in range(n // 2):
            a, b = active[i], active[n - 1 - i]
            mid = f'm_{uuid.uuid4().hex[:8]}'
            t.matches.append(TournamentMatch(
                id=mid, round_num=t.current_round,
                red_uid=a.user_id, black_uid=b.user_id,
                started_at=time.time(),
            ))
        # Odd player gets bye
        if n % 2 == 1:
            active[-1].bye = True
            active[-1].score += 1.0

    def _arena_pairing(self, t: Tournament):
        """Arena: pair whoever is available, sorted by score proximity."""
        active = [p for p in t.players.values()]
        random.shuffle(active)  # Some randomness
        active.sort(key=lambda p: p.score, reverse=True)

        paired = set()
        for i in range(0, len(active) - 1, 2):
            a, b = active[i], active[i + 1]
            mid = f'm_{uuid.uuid4().hex[:8]}'
            t.matches.append(TournamentMatch(
                id=mid, round_num=t.current_round,
                red_uid=a.user_id, black_uid=b.user_id,
                started_at=time.time(),
            ))

    def _finish(self, t: Tournament):
        """Finalize tournament standings."""
        t.status = TournamentStatus.FINISHED

        # Calculate Buchholz tiebreak for Swiss
        if t.format == TournamentFormat.SWISS:
            for p in t.players.values():
                p.buchholz = sum(
                    t.players[opp].score for opp in p.opponents
                    if opp in t.players
                )

    def get_standings(self, tid: str) -> list[dict]:
        t = self.tournaments.get(tid)
        if not t:
            return []
        players = list(t.players.values())
        # Sort: score desc, buchholz desc, elo desc
        players.sort(key=lambda p: (-p.score, -p.buchholz, -p.elo))
        return [
            {
                'rank': i + 1,
                'user_id': p.user_id,
                'display_name': p.display_name,
                'elo': p.elo,
                'score': p.score,
                'wins': p.wins, 'losses': p.losses, 'draws': p.draws,
                'buchholz': p.buchholz,
                'eliminated': p.eliminated,
            }
            for i, p in enumerate(players)
        ]

    def serialize(self, t: Tournament) -> dict:
        return {
            'id': t.id,
            'name': t.name,
            'format': t.format.value,
            'variant': t.variant,
            'timeInitialMs': t.time_initial_ms,
            'timeIncMs': t.time_inc_ms,
            'maxPlayers': t.max_players,
            'minPlayers': t.min_players,
            'rounds': t.rounds,
            'currentRound': t.current_round,
            'status': t.status.value,
            'createdAt': int(t.created_at * 1000),
            'startsAt': int(t.starts_at * 1000),
            'endsAt': int(t.ends_at * 1000),
            'playerCount': len(t.players),
            'description': t.description,
        }

    def serialize_detail(self, t: Tournament) -> dict:
        base = self.serialize(t)
        base['standings'] = self.get_standings(t.id)
        base['matches'] = [
            {
                'id': m.id,
                'round': m.round_num,
                'red': m.red_uid,
                'black': m.black_uid,
                'result': m.result,
                'gameId': m.game_id,
            }
            for m in t.matches
        ]
        return base

    def list_all(self, status: str | None = None) -> list[dict]:
        out = []
        for t in self.tournaments.values():
            if status and t.status.value != status:
                continue
            out.append(self.serialize(t))
        # Sort: upcoming first, then active, then finished
        order = {'upcoming': 0, 'active': 1, 'pairing': 2, 'finished': 3, 'cancelled': 4}
        out.sort(key=lambda x: (order.get(x['status'], 5), -x['createdAt']))
        return out

    def cleanup_old(self, max_age_seconds: int = 86400 * 7):
        """Remove tournaments older than max_age."""
        now = time.time()
        stale = [tid for tid, t in self.tournaments.items()
                 if t.status == TournamentStatus.FINISHED
                 and now - t.created_at > max_age_seconds]
        for tid in stale:
            del self.tournaments[tid]


# ── Singleton ──
tournament_mgr = TournamentManager()
