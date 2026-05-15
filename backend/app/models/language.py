from sqlmodel import SQLModel, Field


class Language(SQLModel, table=True):
    __tablename__ = "languages"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)   # "Python", "Rust", "JavaScript" etc.
    mascot: str                                   # "Slither Serpent"
    emoji: str                                    # "🐍"


class LanguageMatchup(SQLModel, table=True):
    __tablename__ = "language_matchups"

    id: int | None = Field(default=None, primary_key=True)
    winner_lang_id: int = Field(foreign_key="languages.id")
    loser_lang_id: int = Field(foreign_key="languages.id")
    flavor_text: str                              # "Python slithers around Java's bulky armor!"
