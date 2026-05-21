from fastapi import APIRouter, Depends, HTTPException
import httpx
from sqlmodel import Session, select
from datetime import datetime
from app.db.session import get_session
from app.core.deps import get_current_user
from app.models.user import User
from app.models.card import Card
from app.schemas.card import CardRead

cards_router = APIRouter()


@cards_router.post("/cards/sync", response_model=list[CardRead])
def sync_cards(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    headers = {"Authorization": f"Bearer {user.github_access_token}"}

    try:
        res = httpx.get(
            "https://api.github.com/user/repos",
            headers=headers,
            params={"per_page": 100},
            timeout=10,
        )
        res.raise_for_status()
        repos = res.json()
    except (httpx.HTTPError, httpx.TimeoutException) as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch repos from GitHub: {e}")

    details = []
    for repo in repos:
        try:
            r = httpx.get(
                f"https://api.github.com/repos/{repo['full_name']}",
                headers=headers,
                timeout=10,
            )
            r.raise_for_status()
            details.append(r.json())
        except (httpx.HTTPError, httpx.TimeoutException):
            continue

    existing = {
        c.repo_name: c
        for c in session.exec(select(Card).where(Card.user_id == user.id)).all()
    }

    now = datetime.utcnow()
    for repo_data in details:
        if not repo_data.get("full_name") or not repo_data.get("created_at") or not repo_data.get("pushed_at"):
            continue
        created_at = datetime.strptime(repo_data["created_at"], "%Y-%m-%dT%H:%M:%SZ")
        last_pushed = datetime.strptime(repo_data["pushed_at"], "%Y-%m-%dT%H:%M:%SZ")

        card = existing.get(repo_data["full_name"])
        if not card:
            card = Card(user_id=user.id, repo_name=repo_data["full_name"])
            session.add(card)

        card.stars = repo_data["stargazers_count"]
        card.forks = repo_data["forks_count"]
        card.language = repo_data.get("language")
        card.age_years = round((now - created_at).days / 365, 2)
        card.activity_score = max(0, 100 - (now - last_pushed).days)

    session.commit()
    return session.exec(select(Card).where(Card.user_id == user.id)).all()


@cards_router.get("/cards", response_model=list[CardRead])
def get_cards(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return session.exec(select(Card).where(Card.user_id == user.id)).all()


@cards_router.delete('/cards/{card_id}')
def delete_card(card_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    card = session.get(Card, card_id)
    if not card or card.user_id != user.id:
        raise HTTPException(status_code=404, detail="Card not found")
    session.delete(card)
    session.commit()
    return {"message": "card deleted"}
