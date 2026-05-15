from fastapi import APIRouter, Depends, HTTPException
import httpx
from sqlmodel import Session, select
from datetime import datetime
from app.db.session import get_session
from app.core.deps import get_current_user
from pydantic import BaseModel
from app.models.user import User
from app.models.card import Card
from app.schemas.card import CardRead

cards_router = APIRouter()

class FetchCardRequest(BaseModel):
    repos: list[str]


@cards_router.get('/cards/repos')
def get_repo(user:User = Depends(get_current_user)):
    res = httpx.get(
       "https://api.github.com/user/repos",
      headers={"Authorization": f"Bearer {user.github_access_token}"}
    )
    return res.json()

@cards_router.post("/cards/fetch")
def save_cards(body: FetchCardRequest, user:User = Depends(get_current_user),session:Session = Depends(get_session)):
    rep_result :list= []
    for repo in body.repos: 
        result = httpx.get(
             f"https://api.github.com/repos/{repo}",
            headers={"Authorization": f"Bearer {user.github_access_token}"}
        )
        rep_result.append(result.json())

    for repo_data in rep_result:
        created_at = datetime.strptime(repo_data["created_at"], "%Y-%m-%dT%H:%M:%SZ")
        age_years = (datetime.utcnow() - created_at).days / 365
        last_pushed = datetime.strptime(repo_data["pushed_at"], "%Y-%m-%dT%H:%M:%SZ")
        activity_score = max(0, 100 - (datetime.utcnow() - last_pushed).days)

        card = session.exec(
            select(Card).where(Card.user_id == user.id, Card.repo_name == repo_data["full_name"])
        ).first()

        if not card:
            card = Card(user_id=user.id, repo_name=repo_data["full_name"])
            session.add(card)

        card.stars = repo_data["stargazers_count"]
        card.forks = repo_data["forks_count"]
        card.language = repo_data.get("language")
        card.age_years = round(age_years, 2)
        card.activity_score = activity_score
    session.commit()
    return {"message": "cards saved"}

@cards_router.get("/cards", response_model=list[CardRead])
def get_cards(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    cards = session.exec(select(Card).where(Card.user_id == user.id)).all()
    return cards

@cards_router.delete('/cards/{card_id}')
def delete_card(card_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    card = session.get(Card, card_id)
    if not card or card.user_id != user.id:
        raise HTTPException(status_code=404, detail="Card not found")
    session.delete(card)
    session.commit()
    return {"message": "card deleted"}