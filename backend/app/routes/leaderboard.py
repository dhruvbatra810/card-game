from fastapi import APIRouter, Depends, HTTPException
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


@leaderboard_router.get('/leaderboard', response_model=LeaderboardResponse)
def get_leaderboard(
    league: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail="Invalid league")

    results = session.exec(
        select(User).where(User.league == league).order_by(User.rating.desc())
    ).all()

    entries = []
    for i, u in enumerate(results):
        entry = LeaderboardEntry(
            rank=i + 1,
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

    return LeaderboardResponse(entries=entries, total=len(entries))
