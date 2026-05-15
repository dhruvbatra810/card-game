from sqlmodel import SQLModel, Field


class Round(SQLModel, table=True):
    __tablename__ = "rounds"

    id: int | None = Field(default=None, primary_key=True)
    battle_id: int = Field(foreign_key="battles.id", index=True)
    round_number: int

    p1_card_id: int = Field(foreign_key="cards.id")
    p2_card_id: int = Field(foreign_key="cards.id")
    stat_chosen: str                              # "stars" | "forks" | "age_years" | "contributors" | "activity_score"

    winner_id: int | None = Field(default=None, foreign_key="users.id")

    was_tie: bool = Field(default=False)
    was_critical: bool = Field(default=False)     # winner had 10x+ the stat
    type_advantage: bool = Field(default=False)   # language matchup triggered
    points_awarded: int = Field(default=1)        # 2 if carry-over tie, 2 if critical
