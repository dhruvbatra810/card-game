from sqlmodel import SQLModel, Field


class Card(SQLModel, table=True):
    __tablename__ = "cards"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)

    repo_name: str
    stars: int = Field(default=0)
    forks: int = Field(default=0)
    age_years: float = Field(default=0.0)
    contributors: int = Field(default=0)
    activity_score: int = Field(default=0)
    language: str | None = None
    rarity: str = Field(default="common")
