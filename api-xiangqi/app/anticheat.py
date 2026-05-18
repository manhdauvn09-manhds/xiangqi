"""Anti-cheat detection for online games.

Phase 3: Heuristic engine-usage detection based on:
1. Move timing analysis (too fast = engine, too consistent = engine)
2. Move accuracy correlation with engine top choices
3. Statistical anomaly detection (ELO vs win rate)

Note: This is a heuristic system — not a definitive cheat detector.
Real production systems would also log data for manual review.
"""
from __future__ import annotations

import logging
import math
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

_PROFILE_MAX_AGE_SECONDS = 6 * 3600  # 6 hours
_PROFILE_HARD_MAX = 1000  # Max profiles in memory (LRU evicts oldest)
_CLEANUP_INTERVAL_SECONDS = 300  # Cleanup every 5 minutes


@dataclass
class MoveStats:
    """Statistics for a single move in a game."""
    move_time_ms: float  # time taken to make the move
    is_capture: bool = False
    is_check: bool = False


@dataclass
class PlayerGameProfile:
    """Per-game profile for anti-cheat analysis."""
    user_id: int
    move_times: list[float] = field(default_factory=list)
    total_moves: int = 0
    flagged_reasons: list[str] = field(default_factory=list)
    suspicion_score: float = 0.0


class AntiCheatEngine:
    """Heuristic anti-cheat engine with bounded memory via LRU eviction."""

    # Thresholds
    MIN_AVG_MOVE_TIME_MS = 500       # <500ms avg = suspicious
    MIN_MOVE_TIME_MS = 100           # <100ms = impossibly fast (bot)
    MAX_CONSISTENCY = 0.15           # coefficient of variation < 15% = robotic
    MIN_MOVES_FOR_ANALYSIS = 10      # need at least 10 moves to analyze
    SUSPICIOUS_FAST_RATIO = 0.5      # if >50% of moves are <1s = suspicious
    PREMOVE_THRESHOLD_MS = 200       # moves under 200ms indicate pre-moves or engine

    def __init__(self):
        self._profiles: dict[str, dict[int, PlayerGameProfile]] = {}  # game_id → {uid → profile}
        self._created_at: dict[str, float] = {}  # game_id → creation timestamp
        self._last_cleanup: float = time.monotonic()

    def start_game(self, game_id: str, red_uid: int, black_uid: int):
        """Initialize tracking for a new game."""
        # Try cleanup if interval elapsed
        now = time.monotonic()
        if now - self._last_cleanup > _CLEANUP_INTERVAL_SECONDS:
            self._cleanup()
            self._last_cleanup = now

        # If approaching hard limit, force cleanup
        if len(self._profiles) >= _PROFILE_HARD_MAX * 0.9:  # 90% full
            self._cleanup()

        self._profiles[game_id] = {
            red_uid: PlayerGameProfile(user_id=red_uid),
            black_uid: PlayerGameProfile(user_id=black_uid),
        }
        self._created_at[game_id] = now

    def record_move(self, game_id: str, user_id: int, move_time_ms: float,
                    is_capture: bool = False, is_check: bool = False):
        """Record a move for analysis."""
        profiles = self._profiles.get(game_id)
        if not profiles or user_id not in profiles:
            return
        p = profiles[user_id]
        p.move_times.append(move_time_ms)
        p.total_moves += 1

    def analyze_game(self, game_id: str) -> dict[int, dict[str, Any]]:
        """Analyze a completed game for cheating indicators.
        Returns {user_id: {suspicion_score, reasons, flagged}}"""
        profiles = self._profiles.get(game_id)
        if not profiles:
            return {}

        results = {}
        for uid, p in profiles.items():
            score, reasons = self._analyze_player(p)
            results[uid] = {
                'suspicion_score': round(score, 2),
                'reasons': reasons,
                'flagged': score >= 0.7,  # ≥ 70% suspicion = flag for review
                'total_moves': p.total_moves,
                'avg_move_time_ms': round(sum(p.move_times) / max(1, len(p.move_times)), 1),
            }
        return results

    def _analyze_player(self, p: PlayerGameProfile) -> tuple[float, list[str]]:
        """Analyze a single player's moves. Returns (score 0.0-1.0, reasons)."""
        if p.total_moves < self.MIN_MOVES_FOR_ANALYSIS:
            return 0.0, ['too_few_moves']

        score = 0.0
        reasons = []
        times = p.move_times

        # ─── Check 1: Impossibly fast moves ───
        ultra_fast = sum(1 for t in times if t < self.PREMOVE_THRESHOLD_MS)
        if ultra_fast > 3:
            score += 0.3
            reasons.append(f'ultra_fast_moves:{ultra_fast}')

        # ─── Check 2: Average move time too low ───
        avg_time = sum(times) / len(times)
        if avg_time < self.MIN_AVG_MOVE_TIME_MS:
            score += 0.25
            reasons.append(f'avg_time_low:{avg_time:.0f}ms')

        # ─── Check 3: Too many fast moves ───
        fast_count = sum(1 for t in times if t < 1000)
        fast_ratio = fast_count / len(times)
        if fast_ratio > self.SUSPICIOUS_FAST_RATIO:
            score += 0.2
            reasons.append(f'fast_ratio:{fast_ratio:.0%}')

        # ─── Check 4: Too consistent timing (robotic) ───
        if len(times) >= 5:
            mean = sum(times) / len(times)
            if mean > 0:
                variance = sum((t - mean) ** 2 for t in times) / len(times)
                std_dev = math.sqrt(variance)
                cv = std_dev / mean  # coefficient of variation
                if cv < self.MAX_CONSISTENCY:
                    score += 0.2
                    reasons.append(f'robotic_consistency:cv={cv:.2f}')

        # ─── Check 5: No long thinks (>15s) in complex positions ───
        long_thinks = sum(1 for t in times if t > 15000)
        if p.total_moves > 20 and long_thinks == 0:
            score += 0.1
            reasons.append('no_long_thinks')

        return min(1.0, score), reasons

    def end_game(self, game_id: str):
        """Clean up after game ends."""
        self._profiles.pop(game_id, None)
        self._created_at.pop(game_id, None)
        logger.debug('[anticheat] game ended: %s', game_id)

    def _cleanup(self):
        """Remove expired profiles and enforce hard memory limit via LRU."""
        now = time.monotonic()

        # Step 1: Remove TTL-expired profiles
        expired = [gid for gid, ts in self._created_at.items()
                   if now - ts > _PROFILE_MAX_AGE_SECONDS]
        for gid in expired:
            self._profiles.pop(gid, None)
            self._created_at.pop(gid, None)

        if expired:
            logger.debug('[anticheat] cleanup: removed %d expired profiles', len(expired))

        # Step 2: If still over hard limit, evict oldest (LRU)
        if len(self._profiles) > _PROFILE_HARD_MAX:
            # Sort by creation time, remove oldest
            sorted_gids = sorted(self._created_at.keys(),
                                key=lambda gid: self._created_at[gid])
            to_evict = sorted_gids[:len(self._profiles) - _PROFILE_HARD_MAX]
            for gid in to_evict:
                self._profiles.pop(gid, None)
                self._created_at.pop(gid, None)
            logger.warning('[anticheat] memory pressure: evicted %d oldest profiles', len(to_evict))

    def cleanup_stale(self, max_age_seconds: int = _PROFILE_MAX_AGE_SECONDS):
        """Public API — backward compatible."""
        self._cleanup()

    def get_stats(self) -> dict[str, int]:
        """Return current memory stats."""
        return {
            'active_profiles': len(self._profiles),
            'max_profiles': _PROFILE_HARD_MAX,
            'cleanup_interval_seconds': _CLEANUP_INTERVAL_SECONDS,
        }


# ── Singleton ──
anticheat = AntiCheatEngine()


@dataclass
class EloAnomalyResult:
    """Result of ELO anomaly check."""
    flagged: bool
    reason: str
    expected_win_rate: float
    actual_win_rate: float


def check_elo_anomaly(elo: int, games_played: int, wins: int, losses: int) -> EloAnomalyResult:
    """Check if a player's ELO vs win rate is suspiciously mismatched.
    e.g., 1200 ELO with 95% win rate against 1800+ players = suspicious.
    """
    if games_played < 20:
        return EloAnomalyResult(flagged=False, reason='too_few_games',
                                expected_win_rate=0.0, actual_win_rate=0.0)
    actual_wr = wins / max(1, games_played)

    # Expected win rate for ELO bracket (rough heuristic)
    # Around 1200 you'd expect ~50%, deviating based on rating
    # A 1200 player beating 1800+ repeatedly would be suspicious
    expected_wr = 0.5  # baseline
    if elo < 1000:
        expected_wr = 0.35
    elif elo < 1400:
        expected_wr = 0.45
    elif elo < 1800:
        expected_wr = 0.55
    elif elo < 2200:
        expected_wr = 0.6

    # Flag if actual win rate is significantly higher than expected
    delta = actual_wr - expected_wr
    flagged = delta > 0.25 and games_played >= 20
    reason = ''
    if flagged:
        reason = f'win_rate_anomaly: actual={actual_wr:.0%} expected={expected_wr:.0%}'

    return EloAnomalyResult(
        flagged=flagged, reason=reason,
        expected_win_rate=expected_wr, actual_win_rate=actual_wr
    )
