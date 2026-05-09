"""Cờ Tướng Vương — Server-side Xiangqi engine.

Ported from frontend scripts/core/{constants,board,moves,rules}.js.
Used for server-side move validation in online games (anti-cheat).
"""
from __future__ import annotations
from typing import Any

# ═════════════════════════════════════════════
# CONSTANTS
# ═════════════════════════════════════════════

BOARD_W = 9
BOARD_H = 10
RIVER_TOP = 4
RIVER_BOT = 5

OPP = {'r': 'b', 'b': 'r'}

PALACE = {
    'r': {'fileMin': 3, 'fileMax': 5, 'rankMin': 7, 'rankMax': 9},
    'b': {'fileMin': 3, 'fileMax': 5, 'rankMin': 0, 'rankMax': 2},
}

INITIAL_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1'

FEN_MAP: dict[str, dict[str, str]] = {
    'K': {'type': 'K', 'side': 'r'}, 'k': {'type': 'K', 'side': 'b'},
    'A': {'type': 'A', 'side': 'r'}, 'a': {'type': 'A', 'side': 'b'},
    'B': {'type': 'E', 'side': 'r'}, 'b': {'type': 'E', 'side': 'b'},
    'N': {'type': 'H', 'side': 'r'}, 'n': {'type': 'H', 'side': 'b'},
    'R': {'type': 'R', 'side': 'r'}, 'r': {'type': 'R', 'side': 'b'},
    'C': {'type': 'C', 'side': 'r'}, 'c': {'type': 'C', 'side': 'b'},
    'P': {'type': 'P', 'side': 'r'}, 'p': {'type': 'P', 'side': 'b'},
}

TYPE_TO_FEN = {'K': 'K', 'A': 'A', 'E': 'B', 'H': 'N', 'R': 'R', 'C': 'C', 'P': 'P'}


def fen_char(piece: dict) -> str:
    ch = TYPE_TO_FEN[piece['type']]
    return ch if piece['side'] == 'r' else ch.lower()


def in_board(f: int, r: int) -> bool:
    return 0 <= f < BOARD_W and 0 <= r < BOARD_H


def in_palace(f: int, r: int, side: str) -> bool:
    p = PALACE[side]
    return p['fileMin'] <= f <= p['fileMax'] and p['rankMin'] <= r <= p['rankMax']


def across_river(rank: int, side: str) -> bool:
    return rank <= RIVER_TOP if side == 'r' else rank >= RIVER_BOT


def same_river_side(rank: int, side: str) -> bool:
    return rank >= 5 if side == 'r' else rank <= 4


# ═════════════════════════════════════════════
# BOARD STATE
# ═════════════════════════════════════════════

def empty_board(variant: str = 'standard') -> dict:
    sq = [[None] * BOARD_H for _ in range(BOARD_W)]
    return {
        'squares': sq,
        'side': 'r',
        'variant': variant,
        'history': [],
        'fullmove': 1,
        'halfmoveSinceCapture': 0,
    }


def clone_board(board: dict) -> dict:
    sq = [
        [({'type': p['type'], 'side': p['side']} if p else None) for p in col]
        for col in board['squares']
    ]
    return {
        'squares': sq,
        'side': board['side'],
        'variant': board['variant'],
        'history': list(board['history']),
        'fullmove': board['fullmove'],
        'halfmoveSinceCapture': board['halfmoveSinceCapture'],
    }


def piece_at(board: dict, f: int, r: int) -> dict | None:
    if not in_board(f, r):
        return None
    return board['squares'][f][r]


def set_piece(board: dict, f: int, r: int, piece: dict | None):
    board['squares'][f][r] = piece


def find_general(board: dict, side: str) -> dict | None:
    for f in range(BOARD_W):
        for r in range(BOARD_H):
            p = board['squares'][f][r]
            if p and p['type'] == 'K' and p['side'] == side:
                return {'file': f, 'rank': r}
    return None


def apply_move(board: dict, move: dict) -> dict | None:
    ff, fr = move['from']['file'], move['from']['rank']
    tf, tr = move['to']['file'], move['to']['rank']
    piece = piece_at(board, ff, fr)
    if not piece:
        raise ValueError('apply_move: empty source')
    captured = piece_at(board, tf, tr)

    set_piece(board, ff, fr, None)
    set_piece(board, tf, tr, piece)

    if captured:
        board['halfmoveSinceCapture'] = 0
    else:
        board['halfmoveSinceCapture'] += 1
    if board['side'] == 'b':
        board['fullmove'] += 1
    board['side'] = OPP[board['side']]

    record = {
        'from': {'file': ff, 'rank': fr},
        'to': {'file': tf, 'rank': tr},
        'piece': {'type': piece['type'], 'side': piece['side']},
        'captured': {'type': captured['type'], 'side': captured['side']} if captured else None,
    }
    board['history'].append(record)
    return captured


def undo_move(board: dict) -> dict | None:
    if not board['history']:
        return None
    m = board['history'].pop()
    set_piece(board, m['from']['file'], m['from']['rank'], m['piece'])
    set_piece(board, m['to']['file'], m['to']['rank'], m['captured'])
    board['side'] = OPP[board['side']]
    if board['side'] == 'b':
        board['fullmove'] -= 1
    if m['captured']:
        board['halfmoveSinceCapture'] = 0
    elif board['halfmoveSinceCapture'] > 0:
        board['halfmoveSinceCapture'] -= 1
    return m


# ═════════════════════════════════════════════
# FEN SERIALIZATION
# ═════════════════════════════════════════════

def to_fen(board: dict) -> str:
    ranks = []
    for r in range(BOARD_H):
        row = ''
        empty = 0
        for f in range(BOARD_W):
            p = board['squares'][f][r]
            if not p:
                empty += 1
                continue
            if empty > 0:
                row += str(empty)
                empty = 0
            row += fen_char(p)
        if empty > 0:
            row += str(empty)
        ranks.append(row)
    side_tok = 'w' if board['side'] == 'r' else 'b'
    return f"{'/'.join(ranks)} {side_tok} - - {board['halfmoveSinceCapture']} {board['fullmove']}"


def from_fen(fen: str, variant: str = 'standard') -> dict:
    parts = fen.strip().split()
    placement = parts[0]
    side_tok = parts[1] if len(parts) > 1 else 'w'
    halfmove = int(parts[4]) if len(parts) > 4 else 0
    fullmove = int(parts[5]) if len(parts) > 5 else 1

    board = empty_board(variant)
    rank_strs = placement.split('/')
    if len(rank_strs) != BOARD_H:
        raise ValueError(f'from_fen: invalid rank count {len(rank_strs)}')
    for r, rank_str in enumerate(rank_strs):
        f = 0
        for ch in rank_str:
            if ch.isdigit():
                f += int(ch)
                continue
            meta = FEN_MAP.get(ch)
            if not meta:
                raise ValueError(f'from_fen: bad char "{ch}"')
            if f >= BOARD_W:
                raise ValueError(f'from_fen: row {r} overflow')
            board['squares'][f][r] = {'type': meta['type'], 'side': meta['side']}
            f += 1
    board['side'] = 'r' if side_tok == 'w' else 'b'
    board['halfmoveSinceCapture'] = halfmove
    board['fullmove'] = fullmove
    return board


# ═════════════════════════════════════════════
# MOVE GENERATION (pseudo-legal)
# ═════════════════════════════════════════════

def _mk(ff: int, fr: int, tf: int, tr: int) -> dict:
    return {'from': {'file': ff, 'rank': fr}, 'to': {'file': tf, 'rank': tr}}


def general_moves(board: dict, f: int, r: int, side: str) -> list[dict]:
    moves = []
    for df, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nf, nr = f + df, r + dr
        if not in_palace(nf, nr, side):
            continue
        t = piece_at(board, nf, nr)
        if t and t['side'] == side:
            continue
        moves.append(_mk(f, r, nf, nr))
    # Flying general
    for rr in range(BOARD_H):
        if rr == r:
            continue
        p = piece_at(board, f, rr)
        if not p:
            continue
        if p['type'] == 'K' and p['side'] != side:
            lo, hi = min(r, rr) + 1, max(r, rr) - 1
            blocked = False
            for k in range(lo, hi + 1):
                if piece_at(board, f, k):
                    blocked = True
                    break
            if not blocked:
                moves.append(_mk(f, r, f, rr))
            break
        else:
            break
    return moves


def advisor_moves(board: dict, f: int, r: int, side: str) -> list[dict]:
    moves = []
    for df, dr in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        nf, nr = f + df, r + dr
        if not in_palace(nf, nr, side):
            continue
        t = piece_at(board, nf, nr)
        if t and t['side'] == side:
            continue
        moves.append(_mk(f, r, nf, nr))
    return moves


def elephant_moves(board: dict, f: int, r: int, side: str) -> list[dict]:
    moves = []
    for df, dr in ((2, 2), (2, -2), (-2, 2), (-2, -2)):
        nf, nr = f + df, r + dr
        if not in_board(nf, nr):
            continue
        if not same_river_side(nr, side):
            continue
        ef, er = f + df // 2, r + dr // 2
        if piece_at(board, ef, er):
            continue
        t = piece_at(board, nf, nr)
        if t and t['side'] == side:
            continue
        moves.append(_mk(f, r, nf, nr))
    return moves


def horse_moves(board: dict, f: int, r: int, side: str) -> list[dict]:
    moves = []
    dirs = [
        (1, 2, 0, 1), (1, -2, 0, -1),
        (-1, 2, 0, 1), (-1, -2, 0, -1),
        (2, 1, 1, 0), (2, -1, 1, 0),
        (-2, 1, -1, 0), (-2, -1, -1, 0),
    ]
    for df, dr, lf, lr in dirs:
        nf, nr = f + df, r + dr
        if not in_board(nf, nr):
            continue
        if piece_at(board, f + lf, r + lr):
            continue
        t = piece_at(board, nf, nr)
        if t and t['side'] == side:
            continue
        moves.append(_mk(f, r, nf, nr))
    return moves


def rook_moves(board: dict, f: int, r: int, side: str) -> list[dict]:
    moves = []
    for df, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nf, nr = f + df, r + dr
        while in_board(nf, nr):
            t = piece_at(board, nf, nr)
            if not t:
                moves.append(_mk(f, r, nf, nr))
            else:
                if t['side'] != side:
                    moves.append(_mk(f, r, nf, nr))
                break
            nf += df
            nr += dr
    return moves


def cannon_moves(board: dict, f: int, r: int, side: str) -> list[dict]:
    moves = []
    for df, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nf, nr = f + df, r + dr
        while in_board(nf, nr) and not piece_at(board, nf, nr):
            moves.append(_mk(f, r, nf, nr))
            nf += df
            nr += dr
        if in_board(nf, nr):
            nf += df
            nr += dr
            while in_board(nf, nr):
                t = piece_at(board, nf, nr)
                if t:
                    if t['side'] != side:
                        moves.append(_mk(f, r, nf, nr))
                    break
                nf += df
                nr += dr
    return moves


def pawn_moves(board: dict, f: int, r: int, side: str) -> list[dict]:
    moves = []
    forward = -1 if side == 'r' else 1
    tf, tr = f, r + forward
    if in_board(tf, tr):
        t = piece_at(board, tf, tr)
        if not t or t['side'] != side:
            moves.append(_mk(f, r, tf, tr))
    if across_river(r, side):
        for df in (-1, 1):
            nf, nr2 = f + df, r
            if not in_board(nf, nr2):
                continue
            t = piece_at(board, nf, nr2)
            if t and t['side'] == side:
                continue
            moves.append(_mk(f, r, nf, nr2))
    return moves


MOVE_GENERATORS = {
    'K': general_moves,
    'A': advisor_moves,
    'E': elephant_moves,
    'H': horse_moves,
    'R': rook_moves,
    'C': cannon_moves,
    'P': pawn_moves,
}


def moves_for_piece(board: dict, f: int, r: int) -> list[dict]:
    p = piece_at(board, f, r)
    if not p:
        return []
    gen = MOVE_GENERATORS.get(p['type'])
    if not gen:
        return []
    return gen(board, f, r, p['side'])


def generate_pseudo_legal_moves(board: dict, side: str) -> list[dict]:
    out = []
    for f in range(BOARD_W):
        for r in range(BOARD_H):
            p = board['squares'][f][r]
            if not p or p['side'] != side:
                continue
            out.extend(moves_for_piece(board, f, r))
    return out


# ═════════════════════════════════════════════
# RULES — legal filter, check, checkmate, etc
# ═════════════════════════════════════════════

def is_check(board: dict, side: str) -> bool:
    king = find_general(board, side)
    if not king:
        return True
    opp = OPP[side]
    for m in generate_pseudo_legal_moves(board, opp):
        if m['to']['file'] == king['file'] and m['to']['rank'] == king['rank']:
            return True
    return False


def is_facing_generals(board: dict) -> bool:
    rk = find_general(board, 'r')
    bk = find_general(board, 'b')
    if not rk or not bk:
        return False
    if rk['file'] != bk['file']:
        return False
    lo = min(rk['rank'], bk['rank']) + 1
    hi = max(rk['rank'], bk['rank']) - 1
    for k in range(lo, hi + 1):
        if piece_at(board, rk['file'], k):
            return False
    return True


def is_legal_move(board: dict, move: dict) -> bool:
    apply_move(board, move)
    moved_side = OPP[board['side']]
    in_chk = is_check(board, moved_side)
    facing = is_facing_generals(board)
    undo_move(board)
    return not in_chk and not facing


def generate_legal_moves(board: dict, side: str) -> list[dict]:
    return [m for m in generate_pseudo_legal_moves(board, side) if is_legal_move(board, m)]


def is_checkmate(board: dict, side: str) -> bool:
    if not is_check(board, side):
        return False
    return len(generate_legal_moves(board, side)) == 0


def is_stalemate(board: dict, side: str) -> bool:
    if is_check(board, side):
        return False
    return len(generate_legal_moves(board, side)) == 0


def is_60_move_draw(board: dict) -> bool:
    return board['halfmoveSinceCapture'] >= 120


def detect_game_result(board: dict) -> dict:
    side = board['side']
    if is_checkmate(board, side):
        return {'ended': True, 'winner': OPP[side], 'reason': 'checkmate'}
    if is_stalemate(board, side):
        return {'ended': True, 'winner': OPP[side], 'reason': 'stalemate'}
    if is_60_move_draw(board):
        return {'ended': True, 'winner': None, 'reason': '60_move'}
    return {'ended': False}


# ═════════════════════════════════════════════
# VALIDATION — validate a move dict from client
# ═════════════════════════════════════════════

def validate_move(board: dict, move_data: dict) -> tuple[bool, str]:
    """Validate a client move dict. Returns (ok, error_msg)."""
    try:
        fr = move_data.get('from', {})
        to = move_data.get('to', {})
        ff = int(fr.get('file', -1))
        fr_rank = int(fr.get('rank', -1))
        tf = int(to.get('file', -1))
        tr_rank = int(to.get('rank', -1))
    except (TypeError, ValueError):
        return False, 'invalid_coords'

    if not in_board(ff, fr_rank) or not in_board(tf, tr_rank):
        return False, 'out_of_board'

    piece = piece_at(board, ff, fr_rank)
    if not piece:
        return False, 'no_piece_at_source'
    if piece['side'] != board['side']:
        return False, 'wrong_side'

    move = _mk(ff, fr_rank, tf, tr_rank)
    if not is_legal_move(board, move):
        return False, 'illegal_move'

    return True, ''


def validate_iccs(board: dict, iccs: str) -> tuple[bool, str, dict | None]:
    """Validate an ICCS string like 'h2e2'. Returns (ok, error_msg, move_dict)."""
    if not iccs or len(iccs) != 4:
        return False, 'invalid_iccs', None
    try:
        ff = ord(iccs[0].lower()) - ord('a')
        fr = int(iccs[1])
        tf = ord(iccs[2].lower()) - ord('a')
        tr = int(iccs[3])
    except (ValueError, IndexError):
        return False, 'invalid_iccs', None
    move = _mk(ff, fr, tf, tr)
    ok, err = validate_move(board, move)
    return ok, err, move if ok else None
