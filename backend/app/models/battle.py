from datetime import datetime
from sqlmodel import SQLModel, Field


class Battle(SQLModel, table=True):
    __tablename__ = "battles"

    id: int | None = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="users.id", index=True)

    opponent_type: str = Field(default="bot")   # "bot" for Phase 1, "user" for Phase 3
    opponent_id: int | None = None               # None when opponent is bot

    score_player: int = Field(default=0)
    score_opponent: int = Field(default=0)

    winner_id: int | None = None                 # None until battle is finished
    status: str = Field(default="in_progress")   # "in_progress" | "finished"

    created_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: datetime | None = None
