from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db.session import get_session
from app.core.deps import get_current_user
from app.core.battle_logic import get_league, compare_stats
from app.models.user import User
from app.models.battle import Battle
from app.models.round import Round
from app.models.card import Card
from app.models.language import Language, LanguageMatchup
from sqlmodel import Session, select
from datetime import datetime, timezone
from app.schemas.battle import RoundSchema
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

    # compare the chosen stat — bot has no user_id so p2_user_id is None
    try:
        result = compare_stats(p1_card, p2_card, body.stat_chosen, user.id, None)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    winner_id = result["winner_id"]
    was_tie = result["was_tie"]
    was_critical = result["was_critical"]
    type_advantage = result["type_advantage"]
    points = result["points_awarded"]

    flavor_text = None
    if type_advantage:
        if winner_id == user.id:
            winner_lang_name = p1_card.language
            loser_lang_name = p2_card.language
        else:
            winner_lang_name = p2_card.language
            loser_lang_name = p1_card.language

        winner_lang = session.exec(select(Language).where(Language.name == winner_lang_name)).first()
        loser_lang = session.exec(select(Language).where(Language.name == loser_lang_name)).first()

        if winner_lang and loser_lang:
            matchup = session.exec(
                select(LanguageMatchup).where(
                    LanguageMatchup.winner_lang_id == winner_lang.id,
                    LanguageMatchup.loser_lang_id == loser_lang.id,
                )
            ).first()
            if matchup:
                flavor_text = matchup.flavor_text

    if winner_id == user.id:
        battle.score_player += points
    elif not was_tie:
        # winner_id is None and not a tie means bot won
        battle.score_opponent += points

    # round_count: use the already-fetched used_rounds list
    round_count = len(used_rounds)

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
        flavor_text=flavor_text,
        points_awarded=round_obj.points_awarded,
        xp=xp_earned,
        coins=coins_earned,
        score_player=battle.score_player,
        score_opponent=battle.score_opponent,
        rating=user.rating,
        rating_change=rating_change,
    )