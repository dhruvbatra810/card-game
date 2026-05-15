from sqlmodel import SQLModel


class CardRead(SQLModel):
    id: int
    user_id: int
    repo_name: str
    stars: int
    forks: int
    age_years: float
    contributors: int
    activity_score: int
    language: str | None
    rarity: str
