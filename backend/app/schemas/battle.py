from datetime import datetime
from sqlmodel import SQLModel
from app.schemas.user import UserRead


class BattleRead(SQLModel):
    id: int
    player_id: int
    opponent_type: str
    opponent_id: int | None
    score_player: int
    score_opponent: int
    winner_id: int | None
    status: str
    created_at: datetime
    finished_at: datetime | None


class RoundRead(SQLModel):
    id: int
    battle_id: int
    round_number: int
    p1_card_id: int
    p2_card_id: int
    stat_chosen: str
    winner_id: int | None
    was_tie: bool
    was_critical: bool
    type_advantage: bool
    points_awarded: int


class RoundSchema(RoundRead):
    xp: int
    coins: int
