from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlmodel import SQLModel, Session, select
from app.db.session import get_session
from app.core.deps import get_current_user
from app.models.user import User

leaderboard_router = APIRouter()

VALID_LEAGUES = ["bronze", "silver", "gold", "platinum", "diamond"]


class LeaderboardEntry(SQLModel):
    rank: int
    id: int
    username: str
    avatar_url: str | None
    wins: int
    losses: int
    rating: int
    current_streak: int
    league: str


class LeaderboardResponse(SQLModel):
    entries: list[LeaderboardEntry]
    total: int
    limit: int
    offset: int


@leaderboard_router.get('/leaderboard', response_model=LeaderboardResponse)
def get_leaderboard(
    league: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail="Invalid league")

    total = session.exec(
        select(func.count(User.id)).where(User.league == league)
    ).one()

    results = session.exec(
        select(User)
        .where(User.league == league)
        .order_by(User.rating.desc(), User.id.asc())
        .limit(limit)
        .offset(offset)
    ).all()

    entries = []
    for i, u in enumerate(results):
        entry = LeaderboardEntry(
            rank=offset + i + 1,
            id=u.id,
            username=u.username,
            avatar_url=u.avatar_url,
            wins=u.wins,
            losses=u.losses,
            rating=u.rating,
            current_streak=u.current_streak,
            league=u.league,
        )
        entries.append(entry)

    return LeaderboardResponse(entries=entries, total=total, limit=limit, offset=offset)
