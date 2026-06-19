"""
Seed the languages and language_matchups tables.
Run from the backend/ directory with the venv active:

    python seed_languages.py

Safe to run multiple times — it skips rows that already exist.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from sqlmodel import Session, select, create_engine
from app.config import settings
from app.models.language import Language, LanguageMatchup

# ---------------------------------------------------------------------------
# Language data — name, mascot name, emoji
# Sources: design doc for all listed languages; invented in same style for C
# and Objective-C which appear in LANGUAGE_BEATS but not the design doc.
# ---------------------------------------------------------------------------

LANGUAGES = [
    ("Python",       "Slither Serpent",   "🐍"),
    ("JavaScript",   "Bolt Spirit",       "⚡"),
    ("TypeScript",   "Shield Knight",     "🛡️"),
    ("Rust",         "Iron Crab",         "🦀"),
    ("Go",           "Rocket Gopher",     "🚀"),
    ("Java",         "Bean Golem",        "☕"),
    ("Ruby",         "Crystal Sprite",    "💎"),
    ("PHP",          "Elder Elephant",    "🐘"),
    ("C++",          "Iron Mech",         "⚙️"),
    ("C#",           "Maestro Spirit",    "🎼"),
    ("Swift",        "Sky Hawk",          "🦅"),
    ("Kotlin",       "Code Dragon",       "🐉"),
    ("HTML",         "Scroll Wizard",     "📜"),
    ("CSS",          "Color Mage",        "🎨"),
    ("Dart",         "Bullseye Archer",   "🎯"),
    ("Lua",          "Moon Sprite",       "🌙"),
    ("Shell",        "Terminal Hermit",   "🐚"),
    # Invented — not in design doc but present in LANGUAGE_BEATS
    ("C",            "Bit Specter",       "🔩"),
    ("Objective-C",  "Bracket Beast",     "🍎"),
]

# ---------------------------------------------------------------------------
# Matchup data — (winner_name, loser_name, flavor_text)
# Every (winner, loser) pair from LANGUAGE_BEATS in battle_logic.py.
# Design-doc examples are used where they exist; remainder written to match.
# ---------------------------------------------------------------------------

MATCHUPS = [
    # Rust beats everything
    ("Rust", "C",
     "The Iron Crab's memory safety dissolves Bit Specter's raw pointers! No segfaults allowed! 🦀"),
    ("Rust", "C++",
     "Rust's borrow checker pins the Iron Mech! Zero-cost safety wins! 🦀"),
    ("Rust", "Python",
     "Rust's iron shell crushes Python's speed! The snake retreats! 🛡️"),
    ("Rust", "Java",
     "The Iron Crab outclasses the Bean Golem! No garbage collector needed! 🦀"),
    ("Rust", "JavaScript",
     "Rust's type safety short-circuits the Bolt Spirit! No undefined is safe! 🦀"),
    ("Rust", "Go",
     "The Iron Crab's zero-cost abstractions outrun the Rocket Gopher! No GC pause! 🦀"),

    # Go beats
    ("Go", "Java",
     "The Rocket Gopher blasts through the Bean Golem's boilerplate! Goroutines win! 🚀"),
    ("Go", "Python",
     "The Rocket Gopher outruns the Slither Serpent! Compiled speed dominates! 🚀"),
    ("Go", "Ruby",
     "The Rocket Gopher speeds past the Crystal Sprite! Concurrency is key! 🚀"),
    ("Go", "PHP",
     "The Rocket Gopher leaves the Elder Elephant behind! Modern runtime wins! 🚀"),

    # TypeScript beats
    ("TypeScript", "JavaScript",
     "JavaScript's chaos meets TypeScript's order! The Shield Knight blocks every blow! ⚔️"),
    ("TypeScript", "Python",
     "The Shield Knight's strict types freeze the Slither Serpent in its tracks! 🛡️"),
    ("TypeScript", "PHP",
     "TypeScript's type safety banishes the Elder Elephant's chaos! 🛡️"),

    # C++ beats
    ("C++", "Java",
     "The Iron Mech crushes the Bean Golem with raw memory access! No JVM overhead! ⚙️"),
    ("C++", "JavaScript",
     "The Iron Mech stomps the Bolt Spirit with compiled power! Static types dominate! ⚙️"),
    ("C++", "Python",
     "The Iron Mech's raw speed overwhelms the Slither Serpent! Compiled beats scripted! ⚙️"),
    ("C++", "Ruby",
     "The Iron Mech dismantles the Crystal Sprite's elegance! Efficiency wins! ⚙️"),

    # Python beats
    ("Python", "Java",
     "Python slithers around Java's bulky armor! Super effective! 💥"),
    ("Python", "JavaScript",
     "The Slither Serpent's clean syntax hypnotizes the chaotic Bolt Spirit! Charmed! 🐍"),
    ("Python", "Ruby",
     "The Slither Serpent's vast libraries swallow the Crystal Sprite whole! 🐍"),
    ("Python", "PHP",
     "The Slither Serpent sheds the Elder Elephant's ancient skin! Modern wins! 🐍"),

    # Java beats
    ("Java", "JavaScript",
     "The Bean Golem's strong typing crushes the Bolt Spirit's chaos! Discipline wins! ☕"),
    ("Java", "PHP",
     "The Bean Golem's enterprise might overpowers the Elder Elephant! ☕"),
    ("Java", "Ruby",
     "The Bean Golem's JVM speed stomps the Crystal Sprite! Performance matters! ☕"),

    # Swift beats
    ("Swift", "Objective-C",
     "The Sky Hawk swoops through the Bracket Beast's bracket hell! Modern syntax wins! 🦅"),
    ("Swift", "Ruby",
     "The Sky Hawk strikes before the Crystal Sprite can respond! Compiled speed! 🦅"),
    ("Swift", "PHP",
     "The Elder Elephant is too slow for Swift's dive! The Hawk strikes for the win! 🦅"),

    # Kotlin beats
    ("Kotlin", "Java",
     "The Code Dragon burns through the Bean Golem's boilerplate! Concise wins! 🐉"),
    ("Kotlin", "PHP",
     "The Code Dragon's null safety scorches the Elder Elephant! Modern fire! 🐉"),
    ("Kotlin", "Ruby",
     "The Code Dragon's type system outshines the Crystal Sprite! JVM evolved! 🐉"),

    # C beats
    ("C", "Java",
     "The Bit Specter's raw pointers haunt the Bean Golem's JVM! Old school wins! 🔩"),
    ("C", "JavaScript",
     "The Bit Specter's bare metal speed short-circuits the Bolt Spirit! 🔩"),
    ("C", "PHP",
     "The Bit Specter's low-level power corrodes the Elder Elephant's ancient scripts! 🔩"),

    # JavaScript beats
    ("JavaScript", "PHP",
     "The Bolt Spirit's modern runtime overwhelms the Elder Elephant's legacy scripts! ⚡"),
    ("JavaScript", "Ruby",
     "The Bolt Spirit outshines the Crystal Sprite with async chaos! Speed wins! ⚡"),
]


def seed():
    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as session:
        # --- Insert languages ---
        lang_id_map = {}

        for name, mascot, emoji in LANGUAGES:
            existing = session.exec(
                select(Language).where(Language.name == name)
            ).first()

            if existing:
                lang_id_map[name] = existing.id
                print(f"  skip language: {name} (already exists)")
            else:
                lang = Language(name=name, mascot=mascot, emoji=emoji)
                session.add(lang)
                session.flush()  # gets the auto-generated id
                lang_id_map[name] = lang.id
                print(f"  added language: {name} — {emoji} {mascot}")

        session.commit()

        # Re-read ids after commit so they're all populated
        all_langs = session.exec(select(Language)).all()
        for lang in all_langs:
            lang_id_map[lang.name] = lang.id

        # --- Insert matchups ---
        inserted = 0
        skipped = 0

        for winner_name, loser_name, flavor_text in MATCHUPS:
            winner_id = lang_id_map.get(winner_name)
            loser_id = lang_id_map.get(loser_name)

            if winner_id is None or loser_id is None:
                print(f"  WARNING: missing language id for {winner_name} or {loser_name}, skipping matchup")
                continue

            existing = session.exec(
                select(LanguageMatchup).where(
                    LanguageMatchup.winner_lang_id == winner_id,
                    LanguageMatchup.loser_lang_id == loser_id,
                )
            ).first()

            if existing:
                skipped += 1
            else:
                matchup = LanguageMatchup(
                    winner_lang_id=winner_id,
                    loser_lang_id=loser_id,
                    flavor_text=flavor_text,
                )
                session.add(matchup)
                inserted += 1

        session.commit()
        print(f"\nMatchups: {inserted} inserted, {skipped} skipped")
        print("Done.")


if __name__ == "__main__":
    seed()
