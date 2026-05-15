# Backend Phase 1 — MVP Plan

> **Goal:** A working API where a user can log in with GitHub, get their top 5 repos as cards, play a single-player battle vs a bot, and earn XP/coins.
>
> Matches **V1.0** in the [game design doc](../repo-trumps-game-design.md#-version-10--mvp-week-1-2).

---

## 🎯 Scope (what's IN and what's OUT)

### ✅ IN — Phase 1
- GitHub OAuth login
- Fetch + cache user's top 5 public repos
- User profile (XP, coins, streak, wins/losses)
- Battle vs bot (Best of 5, full battle rules from [section 6](../repo-trumps-game-design.md#-6-battle-rules-the-core-game))
- Language type advantage (section 7, twist 1)
- Tie rule + critical hits (section 7, twists 2 & 3)
- Reward calculation (+10 XP, +5 coins per win)
- Streak tracking

### ❌ OUT — defer to later phases
- Player vs player / matchmaking → Phase 3
- League system → Phase 3
- Badges / achievements → Phase 2
- Wild cards (Reverse, Freeze, etc.) → Phase 2
- Lucky charm re-roll → Phase 2
- Shop / cosmetics → Phase 4
- Seasons → Phase 4
- Pokemon magic flavor text (frontend concern)

---

## 🗂️ Target folder structure

```
backend/
├── pyproject.toml
├── alembic.ini
├── .env                       ← secrets (gitignored)
├── migrations/                ← alembic-generated
│   └── versions/
└── app/
    ├── __init__.py
    ├── main.py                ← FastAPI entrypoint
    ├── config.py              ← env vars + settings
    ├── db/
    │   ├── __init__.py
    │   ├── session.py         ← DB connection
    │   └── base.py            ← SQLModel base
    ├── models/                ← DB tables (SQLModel)
    │   ├── __init__.py
    │   ├── user.py
    │   ├── card.py
    │   ├── battle.py
    │   ├── round.py
    │   └── language.py
    ├── schemas/               ← API request/response shapes
    │   ├── __init__.py
    │   ├── user.py
    │   ├── battle.py
    │   └── auth.py
    ├── routes/                ← API endpoints
    │   ├── __init__.py
    │   ├── auth.py
    │   ├── users.py
    │   ├── cards.py
    │   └── battles.py
    └── services/              ← business logic
        ├── __init__.py
        ├── github.py          ← GitHub API client
        ├── battle_engine.py   ← round resolution
        ├── bot.py             ← AI opponent
        └── rewards.py         ← XP/coin calculation
```

---

## ✅ Task checklist

### Step 0 — Decisions before coding
- [ ] Switch from raw SQLAlchemy → **SQLModel** (cleaner syntax, same power)
- [ ] Pick a Postgres host: **Supabase free tier** (DB only) or **Railway** (~$5/mo)
- [ ] Register a GitHub OAuth app at https://github.com/settings/developers

### Step 1 — Project setup
- [ ] `uv remove sqlalchemy && uv add sqlmodel`
- [ ] Create folder structure above (all the `__init__.py` files)
- [ ] Set up `.env` + `.env.example` for secrets
- [ ] Add `app/config.py` to load env vars with `python-dotenv`
- [ ] Set up `app/db/session.py` (engine + session maker)
- [ ] `uv run alembic init migrations`
- [ ] Point Alembic at SQLModel metadata in `migrations/env.py`

### Step 2 — Database models (SQLModel)
- [ ] `User` — id, github_id, username, avatar_url, xp, coins, streak, best_streak, wins, losses, created_at
- [ ] `Card` — id, user_id (FK), repo_name, stars, forks, age_years, contributors, activity_score, language, rarity
- [ ] `Battle` — id, player_id, opponent_type (bot/user), opponent_id, winner_id, score_p1, score_p2, status, created_at, finished_at
- [ ] `Round` — id, battle_id, round_number, p1_card_id, p2_card_id, stat_chosen, winner_id, was_critical, was_tie, type_advantage
- [ ] `Language` — id, name, mascot, emoji
- [ ] `LanguageMatchup` — winner_lang_id, loser_lang_id, flavor_text
- [ ] First migration: `alembic revision --autogenerate -m "initial schema"`
- [ ] Apply: `alembic upgrade head`
- [ ] Seed the Language + LanguageMatchup tables (the 5 rules from section 7)

### Step 3 — Auth (GitHub OAuth)
- [ ] `POST /auth/github/login` — returns GitHub OAuth URL
- [ ] `GET /auth/github/callback` — handles the OAuth code, fetches user info, creates/updates User, returns a JWT
- [ ] JWT dependency for protected routes (`get_current_user`)
- [ ] `GET /me` — return current user info

### Step 4 — Cards from GitHub
- [ ] `services/github.py` — fetch user's top 5 public repos by stars
- [ ] Map each repo → `Card` (compute age, activity score, rarity from stars)
- [ ] `POST /me/cards/sync` — refresh user's cards from GitHub
- [ ] `GET /me/cards` — return current cards
- [ ] Starter cards fallback if user has < 5 repos ([section 4](../repo-trumps-game-design.md#edge-case-new-devs-with-less-than-5-repos))

### Step 5 — Battle engine (vs bot)
- [ ] `POST /battles/start` — create a Battle with bot opponent, deal cards, coin flip for first picker
- [ ] `POST /battles/{id}/pick` — player picks a card for the round
- [ ] `POST /battles/{id}/choose-stat` — picker chooses stat to compare
- [ ] `GET /battles/{id}` — current battle state
- [ ] `services/battle_engine.py` — round resolution logic:
  - Compare stat
  - Apply type advantage (2x stats if language wins matchup)
  - Apply critical hit (winner > 10x loser → +1 bonus round)
  - Apply tie rule (next round worth 2 points)
  - Pick next round's picker (loser of last round)
- [ ] `services/bot.py` — simple AI: pick random card, pick the player's strongest stat... no wait, pick the bot's strongest stat
- [ ] Update User stats when battle ends (win/loss, XP, coins, streak)

### Step 6 — Polish + ship
- [ ] CORS middleware (frontend will be on a different port/domain)
- [ ] Error handlers (clean JSON errors, not HTML)
- [ ] Health check endpoint `GET /health`
- [ ] README with setup instructions
- [ ] Deploy to Railway with Postgres add-on

---

## 🔑 Environment variables needed

```
DATABASE_URL=postgresql://...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
JWT_SECRET=<random-long-string>
FRONTEND_URL=http://localhost:3000
```

---

## ⏱️ Realistic timeline

| Step | Time estimate |
|---|---|
| Step 0 — Decisions | 30 min |
| Step 1 — Setup | 2–3 hrs |
| Step 2 — Models + migrations | 3–4 hrs |
| Step 3 — Auth | 4–6 hrs (first OAuth flow takes a while) |
| Step 4 — Cards | 3–4 hrs |
| Step 5 — Battle engine | 6–8 hrs (most complex part) |
| Step 6 — Polish + deploy | 3–4 hrs |
| **Total** | **~3–4 focused days** or **1–2 weeks part-time** |

---

## 🧪 How we know Phase 1 is done

When you can run this end-to-end with `curl`:

```bash
# 1. Get OAuth URL
curl localhost:8000/auth/github/login

# 2. After browser flow, you have a JWT. Use it:
TOKEN="..."

# 3. Sync your repos as cards
curl -X POST localhost:8000/me/cards/sync -H "Authorization: Bearer $TOKEN"

# 4. Start a battle
BATTLE=$(curl -X POST localhost:8000/battles/start -H "Authorization: Bearer $TOKEN")

# 5. Play 5 rounds against the bot
# ... pick/stat-choose flow ...

# 6. Check your profile — XP/coins/streak updated
curl localhost:8000/me -H "Authorization: Bearer $TOKEN"
```

If all of that works → ship it, move to Phase 2.

---

## 🚧 Known risks / things to watch

- **GitHub API rate limits**: 60 req/hour unauthenticated, 5000/hr with token. Cache cards in DB, don't refetch on every request.
- **OAuth callback URL**: must match exactly what's registered in GitHub. `http://localhost:8000/auth/github/callback` for dev.
- **JWT secret**: long random string, never commit it. Generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- **Alembic + SQLModel**: needs `from sqlmodel import SQLModel` and `target_metadata = SQLModel.metadata` in `migrations/env.py`. Easy to forget.
