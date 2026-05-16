from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db.session import get_session
from app.core.deps import get_current_user
from app.models.user import User
from app.models.battle import Battle
from app.models.round import Round
from app.models.card import Card
from sqlmodel import Session, select
import random

battle_router = APIRouter()


class RoundRequest(BaseModel):
    p1_card_id: int
    stat_chosen: str  # "stars" | "forks" | "age_years" | "contributors" | "activity_score"


@battle_router.post('/battles',response_model=Battle)
def start_battle(session:Session = Depends(get_session), user: User = Depends(get_current_user))->Battle:
    
    battleV = Battle(
         player_id = user.id,               
    )
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

@battle_router.post('/battles/{id}/round', response_model=Round)
def start_round(id: int, body: RoundRequest, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    # fetch the battle and verify it belongs to this user
    battle = session.get(Battle, id)
    if not battle or battle.player_id != user.id:
        raise HTTPException(status_code=404, detail="Battle not found")

    # fetch player's card
    p1_card = session.get(Card, body.p1_card_id)
    if not p1_card or p1_card.user_id != user.id:
        raise HTTPException(status_code=404, detail="Card not found")

    # get cards already used by bot in this battle
    used_rounds = session.exec(select(Round).where(Round.battle_id == id)).all()
    used_p2_ids = [r.p2_card_id for r in used_rounds]

    # pick a random bot card that hasn't been used yet
    bot_cards = session.exec(select(Card).where(Card.user_id != user.id)).all()
    available = [c for c in bot_cards if c.id not in used_p2_ids]
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

    if was_tie:
        winner_id = None
    elif p1_val > p2_val:
        winner_id = user.id
        battle.score_player += points
    else:
        winner_id = None  # bot win, no user id
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
        type_advantage=False,
        points_awarded=points,
    )
    session.add(round_obj)
    session.commit()
    session.refresh(round_obj)
    return round_obj