from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, TIMESTAMP


def utcnow():
    return datetime.now(timezone.utc)


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
    rating: int = Field(default=1000)
    league: str = Field(default="silver")
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(TIMESTAMP(timezone=True), nullable=False)
    )
    github_access_token: str | None = None
    last_played: datetime | None = Field(
        default=None,
        sa_column=Column(TIMESTAMP(timezone=True), nullable=True)
    )