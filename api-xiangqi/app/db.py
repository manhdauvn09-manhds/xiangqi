"""SQLite layer + migrations.

Lý do dùng SQLite thay Postgres ở Phase 2 v1:
- Không cần Docker / DB server riêng.
- File-based, dễ backup.
- Hỗ trợ JSON1 → đủ flexibility cho game records.
- Chuyển sang Postgres khi scale (cùng SQL dialect, sửa connector).
"""
import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Iterable

DB_PATH = Path(os.getenv('XQ_DB_PATH', './data/xiangqi.db'))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

_lock = threading.Lock()      # SQLite write serialize
_conn: sqlite3.Connection | None = None


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(str(DB_PATH), check_same_thread=False, isolation_level=None, timeout=30.0)
        _conn.row_factory = sqlite3.Row
        _conn.execute('PRAGMA journal_mode=WAL')
        _conn.execute('PRAGMA foreign_keys=ON')
        _conn.execute('PRAGMA synchronous=NORMAL')
        _conn.execute('PRAGMA busy_timeout=30000')  # 30s timeout for locks
        migrate(_conn)
    return _conn


def query(sql: str, params: Iterable[Any] = ()) -> list[sqlite3.Row]:
    """Execute SELECT query. Cursor auto-closed after fetchall()."""
    conn = get_conn()
    cur = conn.execute(sql, params)
    try:
        return cur.fetchall()
    finally:
        cur.close()


def fetch_one(sql: str, params: Iterable[Any] = ()) -> sqlite3.Row | None:
    """Execute SELECT returning one row. Cursor auto-closed after fetchone()."""
    conn = get_conn()
    cur = conn.execute(sql, params)
    try:
        return cur.fetchone()
    finally:
        cur.close()


def execute(sql: str, params: Iterable[Any] = ()) -> int:
    """Insert/update/delete. Trả về lastrowid."""
    with _lock:
        cur = get_conn().execute(sql, params)
        return cur.lastrowid or cur.rowcount


def execute_many(sql: str, params_list: Iterable[Iterable[Any]]) -> None:
    with _lock:
        get_conn().executemany(sql, params_list)


def close_conn() -> None:
    """Close global connection. Call on app shutdown."""
    global _conn
    if _conn is not None:
        try:
            _conn.close()
        except Exception as e:
            print(f'[db] error closing connection: {e}')
        finally:
            _conn = None


# ─────────────── Migrations ───────────────

MIGRATIONS = [
    # v1 — initial
    """
    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        email         TEXT UNIQUE NOT NULL COLLATE NOCASE,
        display_name  TEXT NOT NULL,
        password_hash TEXT,
        google_sub    TEXT UNIQUE,
        avatar_url    TEXT,
        lang          TEXT NOT NULL DEFAULT 'vi',
        theme         TEXT NOT NULL DEFAULT 'auto',
        created_at    INTEGER NOT NULL,
        last_seen_at  INTEGER
    );
    CREATE TABLE IF NOT EXISTS elo_profiles (
        user_id      INTEGER NOT NULL,
        variant      TEXT NOT NULL,
        elo          INTEGER NOT NULL DEFAULT 1200,
        peak_elo     INTEGER NOT NULL DEFAULT 1200,
        games_played INTEGER NOT NULL DEFAULT 0,
        wins         INTEGER NOT NULL DEFAULT 0,
        losses       INTEGER NOT NULL DEFAULT 0,
        draws        INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, variant),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS games (
        id              TEXT PRIMARY KEY,
        variant         TEXT NOT NULL,
        mode            TEXT NOT NULL,
        red_user_id     INTEGER,
        black_user_id   INTEGER,
        red_bot_level   INTEGER,
        black_bot_level INTEGER,
        result          TEXT,
        termination     TEXT,
        pgn             TEXT,
        moves_json      TEXT NOT NULL,
        start_fen       TEXT,
        blind_seed_hash TEXT,
        blind_seed      TEXT,
        time_control    TEXT,
        duration_ms     INTEGER,
        red_elo_before  INTEGER,
        black_elo_before INTEGER,
        red_elo_delta   INTEGER,
        black_elo_delta INTEGER,
        played_at       INTEGER NOT NULL,
        FOREIGN KEY (red_user_id) REFERENCES users(id),
        FOREIGN KEY (black_user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_games_red ON games(red_user_id, played_at DESC);
    CREATE INDEX IF NOT EXISTS idx_games_black ON games(black_user_id, played_at DESC);

    CREATE TABLE IF NOT EXISTS challenges (
        code            TEXT PRIMARY KEY,
        creator_id      INTEGER NOT NULL,
        variant         TEXT NOT NULL,
        time_initial_ms INTEGER NOT NULL,
        time_inc_ms     INTEGER NOT NULL DEFAULT 0,
        creator_side    TEXT NOT NULL,
        password_hash   TEXT,
        password_salt   TEXT,
        rated           INTEGER NOT NULL DEFAULT 0,
        notes           TEXT,
        created_at      INTEGER NOT NULL,
        expires_at      INTEGER NOT NULL,
        joined_user_id  INTEGER,
        game_id         TEXT,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);

    CREATE TABLE IF NOT EXISTS daily_attempts (
        user_id     INTEGER NOT NULL,
        date_key    TEXT NOT NULL,
        solved      INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER,
        attempts    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, date_key)
    );
    CREATE TABLE IF NOT EXISTS super_ai_quota (
        user_id  INTEGER NOT NULL,
        iso_week TEXT NOT NULL,
        used     INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, iso_week)
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id   TEXT NOT NULL,
        sender_id INTEGER NOT NULL,
        text      TEXT NOT NULL,
        sent_at   INTEGER NOT NULL,
        flagged   INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_chat_game ON chat_messages(game_id, sent_at);

    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
    );
    """,
    # v2 — Phase 3: tournaments, email verification, anticheat
    """
    ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS tournaments (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        format          TEXT NOT NULL,
        variant         TEXT NOT NULL DEFAULT 'standard',
        time_initial_ms INTEGER NOT NULL DEFAULT 600000,
        time_inc_ms     INTEGER NOT NULL DEFAULT 5000,
        max_players     INTEGER NOT NULL DEFAULT 64,
        min_players     INTEGER NOT NULL DEFAULT 4,
        rounds          INTEGER NOT NULL DEFAULT 0,
        current_round   INTEGER NOT NULL DEFAULT 0,
        status          TEXT NOT NULL DEFAULT 'upcoming',
        creator_id      INTEGER NOT NULL,
        description     TEXT,
        created_at      INTEGER NOT NULL,
        starts_at       INTEGER NOT NULL,
        ends_at         INTEGER NOT NULL,
        data_json       TEXT,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status, starts_at);

    CREATE TABLE IF NOT EXISTS tournament_players (
        tournament_id TEXT NOT NULL,
        user_id       INTEGER NOT NULL,
        seed          INTEGER NOT NULL DEFAULT 0,
        score         REAL NOT NULL DEFAULT 0.0,
        wins          INTEGER NOT NULL DEFAULT 0,
        losses        INTEGER NOT NULL DEFAULT 0,
        draws         INTEGER NOT NULL DEFAULT 0,
        buchholz      REAL NOT NULL DEFAULT 0.0,
        eliminated    INTEGER NOT NULL DEFAULT 0,
        joined_at     INTEGER NOT NULL,
        PRIMARY KEY (tournament_id, user_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tournament_matches (
        id             TEXT PRIMARY KEY,
        tournament_id  TEXT NOT NULL,
        round_num      INTEGER NOT NULL,
        red_uid        INTEGER NOT NULL,
        black_uid      INTEGER NOT NULL,
        result         TEXT,
        game_id        TEXT,
        started_at     INTEGER,
        ended_at       INTEGER,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tmatch_tour ON tournament_matches(tournament_id, round_num);

    CREATE TABLE IF NOT EXISTS anticheat_reports (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id     TEXT NOT NULL,
        user_id     INTEGER NOT NULL,
        suspicion   REAL NOT NULL DEFAULT 0.0,
        reasons     TEXT,
        flagged     INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ac_user ON anticheat_reports(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ac_flagged ON anticheat_reports(flagged, created_at DESC);
    """,
    # v3 — add is_admin column for admin-only endpoints
    """
    ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
    """,
]


def migrate(conn: sqlite3.Connection) -> None:
    """Run schema migrations. Each migration is atomic."""
    try:
        if has_table(conn, 'schema_version'):
            row = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()
            current = row[0] or 0
        else:
            current = 0

        target = len(MIGRATIONS)
        if current >= target:
            return

        print(f'[db] migrating {current} → {target}')

        for v in range(current, target):
            try:
                sql = MIGRATIONS[v]
                # SQLite doesn't allow multiple statements in one execute, but executescript does
                conn.executescript(sql)
                conn.execute('INSERT INTO schema_version(version) VALUES (?)', (v + 1,))
                conn.commit()
                print(f'[db] migration {v+1} applied successfully')
            except Exception as e:
                conn.rollback()
                print(f'[db] ERROR in migration {v+1}: {e}')
                raise
    except Exception as e:
        print(f'[db] Migration failed: {e}')
        raise


def has_table(conn: sqlite3.Connection, name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone()
    return row is not None
