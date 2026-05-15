from datetime import datetime
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    github_id: str = Field(unique=True, index=True)
    username: str = Field(index=True)
    email: str | None = None
    avatar_url: str | None = None
    wins: int = Field(default=0)
    losses: int = Field(default=0)
    best_streak: int = Field(default=0)
    current_streak: int = Field(default=0)
    xp: int = Field(default=0)
    coins: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    github_access_token: str | None = None
