"""ELO calculator — mirror frontend scripts/elo/elo.js."""

STARTING_ELO = 1200

RANKS = [
    (0, 'tap_su'), (1000, 'tan_binh'), (1200, 'dong'), (1400, 'bac'),
    (1600, 'vang'), (1800, 'bach_kim'), (2000, 'cao_thu'),
    (2200, 'dai_su'), (2400, 'tong_su'),
]


def expected_score(my: int, op: int) -> float:
    return 1.0 / (1.0 + 10 ** ((op - my) / 400.0))


def k_factor(elo: int, games_played: int) -> int:
    if games_played < 30:
        return 40
    if elo < 2200:
        return 24
    return 16


def update_elo(my_elo: int, op_elo: int, result: float, games_played: int = 0):
    """result: 1.0 win, 0.5 draw, 0.0 loss. Trả về (new, delta, k)."""
    e = expected_score(my_elo, op_elo)
    k = k_factor(my_elo, games_played)
    delta = round(k * (result - e))
    return my_elo + delta, delta, k


def get_rank(elo: int) -> str:
    name = 'tap_su'
    for threshold, n in RANKS:
        if elo >= threshold:
            name = n
    return name
