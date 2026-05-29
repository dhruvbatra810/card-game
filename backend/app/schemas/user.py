from datetime import datetime
from sqlmodel import SQLModel


class UserRead(SQLModel):
    id: int
    username: str
    email: str | None
    avatar_url: str | None
    wins: int
    losses: int
    best_streak: int
    current_streak: int
    xp: int
    coins: int
    rating: int
    league: str
    created_at: datetime
