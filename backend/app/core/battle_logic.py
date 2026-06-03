from datetime import datetime, timezone
from sqlmodel import Session
from app.models.user import User
from app.models.battle import Battle

LANGUAGE_BEATS: dict[str, list[str]] = {
    "Rust":       ["C", "C++", "Python", "Java", "JavaScript", "Go"],
    "Go":         ["Java", "Python", "Ruby", "PHP"],
    "TypeScript": ["JavaScript", "Python", "PHP"],
    "C++":        ["Java", "JavaScript", "Python", "Ruby"],
    "Python":     ["Java", "JavaScript", "Ruby", "PHP"],
    "Java":       ["JavaScript", "PHP", "Ruby"],
    "Swift":      ["Objective-C", "Ruby", "PHP"],
    "Kotlin":     ["Java", "PHP", "Ruby"],
    "C":          ["Java", "JavaScript", "PHP"],
    "JavaScript": ["PHP", "Ruby"],
}

LEAGUE_ORDER = ["bronze", "silver", "gold", "platinum", "diamond"]

VALID_STATS = frozenset(["stars", "forks", "age_years", "contributors", "activity_score"])


def get_league(rating: int) -> str:
    if rating < 1000:
        return "bronze"
    if rating < 1500:
        return "silver"
    if rating < 2000:
        return "gold"
    if rating < 2500:
        return "platinum"
    return "diamond"


def get_adjacent_leagues(league: str) -> list[str]:
    if league not in LEAGUE_ORDER:
        return []
    idx = LEAGUE_ORDER.index(league)
    leagues = [league]
    if idx > 0:
        leagues.append(LEAGUE_ORDER[idx - 1])
    if idx < len(LEAGUE_ORDER) - 1:
        leagues.append(LEAGUE_ORDER[idx + 1])
    return leagues


def check_language_stat(lang1: str, lang2: str) -> int:
    # returns 1 if lang1 wins, 2 if lang2 wins, 0 if no advantage
    lang1_beats = LANGUAGE_BEATS.get(lang1, [])
    if lang2 in lang1_beats:
        return 1

    lang2_beats = LANGUAGE_BEATS.get(lang2, [])
    if lang1 in lang2_beats:
        return 2

    return 0


def compare_stats(p1_card, p2_card, stat: str, p1_user_id: int, p2_user_id) -> dict:
    """
    Compare two cards on a stat. Returns result dict without writing to DB.
    p2_user_id can be None for bot battles (bot has no user ID).
    Raises ValueError for unrecognised stat names.
    """
    if stat not in VALID_STATS:
        raise ValueError(f"Invalid stat: {stat!r}")
    p1_val = getattr(p1_card, stat)
    p2_val = getattr(p2_card, stat)

    was_tie = p1_val == p2_val
    was_critical = False
    type_advantage = False
    winner_id = None
    points = 1

    if not was_tie and min(p1_val, p2_val) > 0:
        was_critical = (max(p1_val, p2_val) >= min(p1_val, p2_val) * 10)

    if was_critical:
        points = 2

    if was_tie:
        lang_result = check_language_stat(p1_card.language, p2_card.language)
        if lang_result == 1:
            type_advantage = True
            was_tie = False
            winner_id = p1_user_id
        elif lang_result == 2:
            type_advantage = True
            was_tie = False
            winner_id = p2_user_id
        else:
            winner_id = None  # true tie
            points = 0
    elif p1_val > p2_val:
        winner_id = p1_user_id
    else:
        winner_id = p2_user_id

    return {
        "winner_id": winner_id,
        "was_tie": was_tie,
        "was_critical": was_critical,
        "type_advantage": type_advantage,
        "points_awarded": points,
    }


def apply_pvp_draw_results(session: Session, battle: Battle, user1: User, user2: User) -> dict:
    """
    Updates both users' stats when a PvP battle ends in a draw.
    Both players receive small rewards with no rating change.
    """
    for user in [user1, user2]:
        user.xp += 50
        user.coins += 10
        session.add(user)

    user1_result = {
        "user_id": user1.id,
        "xp": 50,
        "coins": 10,
        "rating_change": 0,
        "rating": user1.rating,
    }
    user2_result = {
        "user_id": user2.id,
        "xp": 50,
        "coins": 10,
        "rating_change": 0,
        "rating": user2.rating,
    }

    return {"player1": user1_result, "player2": user2_result}


def apply_pvp_battle_results(session: Session, battle: Battle, winner_user: User, loser_user: User) -> dict:
    """
    Updates both users' stats when a PvP battle ends.
    Returns per-player result dicts keyed 'winner' and 'loser'.
    """
    winner_user.wins += 1
    winner_user.current_streak += 1
    if winner_user.current_streak > winner_user.best_streak:
        winner_user.best_streak = winner_user.current_streak
    winner_user.xp += 100
    winner_user.coins += 50
    winner_user.rating += 25
    winner_rating_change = 25
    winner_user.league = get_league(winner_user.rating)

    loser_user.losses += 1
    loser_user.current_streak = 0
    loser_user.xp += 25
    old_loser_rating = loser_user.rating
    loser_user.rating = max(0, loser_user.rating - 15)
    loser_rating_change = loser_user.rating - old_loser_rating
    loser_user.league = get_league(loser_user.rating)

    session.add(winner_user)
    session.add(loser_user)

    winner_result = {
        "user_id": winner_user.id,
        "xp": 100,
        "coins": 50,
        "rating_change": winner_rating_change,
        "rating": winner_user.rating,
    }
    loser_result = {
        "user_id": loser_user.id,
        "xp": 25,
        "coins": 0,
        "rating_change": loser_rating_change,
        "rating": loser_user.rating,
    }

    return {"winner": winner_result, "loser": loser_result}
