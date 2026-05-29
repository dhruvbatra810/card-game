from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db.session import get_session
from app.core.deps import get_current_user
from app.models.user import User
from app.models.battle import Battle
from app.models.round import Round
from app.models.card import Card
from sqlmodel import Session, select
from datetime import datetime, timezone
from app.schemas.battle import RoundSchema
import random

battle_router = APIRouter()

# LANGUAGE_BEATS[lang] lists the languages that lang beats.
# checkLanguageStat: if lang2 is in LANGUAGE_BEATS[lang1], lang1 wins; if lang1 is in LANGUAGE_BEATS[lang2], lang2 wins.
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


def checkLanguageStat(lang1: str, lang2: str) -> int:
    # returns 1 if lang1 wins, 2 if lang2 wins, 0 if no advantage
    lang1_beats = LANGUAGE_BEATS.get(lang1, [])
    if lang2 in lang1_beats:
        return 1

    lang2_beats = LANGUAGE_BEATS.get(lang2, [])
    if lang1 in lang2_beats:
        return 2

    return 0



class RoundRequest(BaseModel):
    p1_card_id: int
    stat_chosen: str  # "stars" | "forks" | "age_years" | "contributors" | "activity_score"


@battle_router.post('/battles',response_model=Battle)
def start_battle(session:Session = Depends(get_session), user: User = Depends(get_current_user))->Battle:
    
    battleV = Battle(
         player_id = user.id,               
    )

    if user.last_played is not None:
        time_since_last = datetime.now(timezone.utc) - user.last_played
        if time_since_last.days >= 2:
            user.current_streak = 0

    user.last_played = datetime.now(timezone.utc)
    session.add(user)
    session.add(battleV)
    session.commit()
    session.refresh(battleV)
    return battleV

@battle_router.get('/battles', response_model= list[Battle])
def get_battle(session:Session = Depends(get_session), user: User = Depends(get_current_user))-> list[Battle]:
    return session.exec(select(Battle).where((Battle.player_id == user.id) | (Battle.opponent_id == user.id) )).all()
    
    
@battle_router.get('/battles/{id}', response_model = Battle)
def get_battle_by_id(id:int,session:Session = Depends(get_session), user: User = Depends(get_current_user)):
    return session.exec(select(Battle).where((Battle.id == id) & ((Battle.player_id == user.id) | (Battle.opponent_id == user.id) ))).first()

@battle_router.post('/battles/{id}/round', response_model=RoundSchema)
def start_round(id: int, body: RoundRequest, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    # fetch the battle and verify it belongs to this user
    battle = session.get(Battle, id)
    if not battle or battle.player_id != user.id:
        raise HTTPException(status_code=404, detail="Battle not found")

    # fetch player's card
    p1_card = session.get(Card, body.p1_card_id)
    if not p1_card or p1_card.user_id != user.id:
        raise HTTPException(status_code=404, detail="Card not found")

    # get cards already used in this battle
    used_rounds = session.exec(select(Round).where(Round.battle_id == id)).all()
    used_p1_ids = [r.p1_card_id for r in used_rounds]
    used_p2_ids = [r.p2_card_id for r in used_rounds]

    # reject if player tries to reuse a card
    if body.p1_card_id in used_p1_ids:
        raise HTTPException(status_code=400, detail="Card already used in this battle")

    # pick a random bot card that hasn't been used yet
    # use any card in the DB except the one the player just played and already-used bot cards
    all_cards = session.exec(select(Card)).all()
    available = []
    for c in all_cards:
        if c.id not in used_p2_ids and c.id != body.p1_card_id:
            available.append(c)
    if not available:
        raise HTTPException(status_code=400, detail="No bot cards available")
    p2_card = random.choice(available)

    # compare the chosen stat
    p1_val = getattr(p1_card, body.stat_chosen)
    p2_val = getattr(p2_card, body.stat_chosen)

    was_tie = p1_val == p2_val
    # critical hit: winner has 10x or more the stat
    was_critical = not was_tie and (max(p1_val, p2_val) >= min(p1_val, p2_val) * 10) if min(p1_val, p2_val) > 0 else False
    points = 2 if was_critical else 1

    type_advantage = False
    if was_tie:
        lang_result = checkLanguageStat(p1_card.language, p2_card.language)
        if lang_result == 1:
            type_advantage = True
            was_tie = False
            winner_id = user.id
            battle.score_player += 1
        elif lang_result == 2:
            type_advantage = True
            was_tie = False
            winner_id = None  # bot wins
            battle.score_opponent += 1
        else:
            winner_id = None  # true tie, no advantage
    elif p1_val > p2_val:
        winner_id = user.id
        battle.score_player += points
    else:
        winner_id = None  # bot win
        battle.score_opponent += points

    # count rounds played so far
    round_count = len(session.exec(select(Round).where(Round.battle_id == id)).all())

    round_obj = Round(
        battle_id=id,
        round_number=round_count + 1,
        p1_card_id=body.p1_card_id,
        p2_card_id=p2_card.id,
        stat_chosen=body.stat_chosen,
        winner_id=winner_id,
        was_tie=was_tie,
        was_critical=was_critical,
        type_advantage=type_advantage,
        points_awarded=points,
    )
    session.add(round_obj)

    xp_earned = 0
    coins_earned = 0
    rating_change = 0

    # check if battle is now finished: first to 3 points, or all 5 rounds played
    is_last_round = (round_count + 1) >= 5
    battle_over = battle.score_player >= 3 or battle.score_opponent >= 3 or is_last_round

    if battle_over:
        battle.status = "finished"
        battle.finished_at = datetime.now(timezone.utc)

        player_won = battle.score_player > battle.score_opponent

        if player_won:
            battle.winner_id = user.id
            user.wins += 1
            user.current_streak += 1
            if user.current_streak > user.best_streak:
                user.best_streak = user.current_streak
            user.xp += 100
            user.coins += 50
            xp_earned = 100
            coins_earned = 50
            user.rating += 25
            rating_change = 25
        else:
            user.losses += 1
            user.current_streak = 0
            user.xp += 25
            xp_earned = 25
            coins_earned = 0
            old_rating = user.rating
            user.rating = max(0, user.rating - 15)
            rating_change = user.rating - old_rating

        user.league = get_league(user.rating)

    session.commit()
    session.refresh(round_obj)

    return RoundSchema(
        id=round_obj.id,
        battle_id=round_obj.battle_id,
        round_number=round_obj.round_number,
        p1_card_id=round_obj.p1_card_id,
        p2_card_id=round_obj.p2_card_id,
        stat_chosen=round_obj.stat_chosen,
        winner_id=round_obj.winner_id,
        was_tie=round_obj.was_tie,
        was_critical=round_obj.was_critical,
        type_advantage=round_obj.type_advantage,
        points_awarded=round_obj.points_awarded,
        xp=xp_earned,
        coins=coins_earned,
        score_player=battle.score_player,
        score_opponent=battle.score_opponent,
        rating=user.rating,
        rating_change=rating_change,
    )