# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Python code style — strictly required

The user is new to Python. All Python code written in this repo must follow these rules:

- **80% plain code, 20% shorthands max.** Default to simple `for` loops, `if` blocks, and named variables.
- Do not use list comprehensions, dict comprehensions, or generator expressions unless there is no simpler alternative.
- Do not chain method calls across multiple operations — break them into steps with named variables.
- Do not use walrus operator (`:=`), `lambda`, `map()`, `filter()`, or `reduce()`.
- One thing per line. No clever one-liners.

**Wrong:**
```python
details = [httpx.get(f".../{repo['full_name']}", headers=headers).json() for repo in repos]
```

**Right:**
```python
details = []
for repo in repos:
    url = f"https://api.github.com/repos/{repo['full_name']}"
    response = httpx.get(url, headers=headers)
    details.append(response.json())
```

## What this project is

Repo Trumps — a card battle game where GitHub repositories become trading cards. Players sync their GitHub repos, which become cards with stats (stars, forks, age, contributors, activity score). Cards battle each other in a Top Trumps style: pick a stat, compare, highest wins. Currently at MVP (Phase 1).

## Running the project

**Database (required first):**
```bash
docker-compose up -d
```

**Backend:**
```bash
cd backend
source .venv/bin/activate   # or: python -m venv .venv && source .venv/bin/activate && uv sync
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev   # http://localhost:3000
```

**Apply DB migrations:**
```bash
cd backend
alembic upgrade head
```

**Create a new migration after changing a model:**
```bash
alembic revision --autogenerate -m "describe the change"
```

## Environment variables

**backend/.env:**
```
DATABASE_URL=postgresql+psycopg://dhruv:password@localhost:5432/repotrumps
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SECRET_KEY=...
ALLOWED_ORIGINS=["http://localhost:3000"]
```

**frontend/.env:**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
API_BASE_URL=http://localhost:8000
```

## Architecture

### Auth flow
1. Frontend calls `GET /auth/github` → backend returns GitHub OAuth URL
2. User is redirected to GitHub, then back to `GET /auth/github/callback?code=...`
3. Backend exchanges code for a GitHub token, creates or updates the User row, issues a JWT
4. JWT is stored as a cookie (`token=...`) on the frontend
5. All protected API calls send `credentials: 'include'` so the cookie is forwarded
6. `get_current_user` in `backend/app/core/deps.py` validates the JWT on every protected route

### Card sync flow
`POST /cards/sync` → fetch user's repos from GitHub API → for each repo fetch detail → compute stats → upsert into Card table

Rarity is assigned based on computed stats (stars, forks, age, contributors, activity).

### Battle flow
`POST /battles` creates a Battle row. `POST /battles/{id}/round` accepts `p1_card_id` + `stat_chosen`, bot picks a random card and stat, highest stat wins. Critical hit triggers when win margin ≥ 10× (awards 2 points). First to 3 wins the battle.

### Backend layout
```
backend/app/
  main.py          — FastAPI app, CORS middleware
  config.py        — env var settings (pydantic)
  core/
    deps.py        — JWT auth dependency (get_current_user)
    jwt.py         — token creation/validation
  db/session.py    — engine + get_session dependency
  models/          — SQLModel table classes (User, Card, Battle, Round, Language)
  schemas/         — Pydantic response shapes (CardRead, BattleRead, etc.)
  routes/          — one file per resource (auth, users, cards, battle)
```

### Frontend layout
```
frontend/
  app/
    layout.tsx              — root layout: Navbar, footer
    page.tsx                — landing page (demo cards + login button)
    dashboard/page.tsx      — server component: fetches /cards, passes to client
    auth/github/callback/   — handles OAuth redirect, sets token cookie
  components/
    card.tsx                — the core card UI (stats, rarity glow, language mascot)
    login-button.tsx        — checks token cookie, shows Login or Battle button
    dashboard/              — deck grid, battle queue sidebar, deck header
  lib/utils.ts              — Tailwind cn() helper
```

### Key conventions

**Frontend data fetching:** The dashboard uses a Server Component (`dashboard/page.tsx`) that reads the cookie and calls the backend directly, then passes data to a Client Component. Don't move that fetch client-side.

**Cookie auth:** The JWT token lives in a cookie named `token`. The frontend reads it with a regex (`/(?:^|; )token=([^;]*)/)`) to handle `=` padding in the JWT. Don't use `.split('=')[1]` — it truncates base64-padded tokens.

**httpx calls to GitHub:** Always set `timeout=10` and call `.raise_for_status()`. Wrap in try/except for `httpx.HTTPError` and `httpx.TimeoutException`. One failed repo should not abort the whole sync — use `continue`.

**Tailwind theme:** Custom colors are defined in `frontend/app/globals.css`. Use semantic names: `bg`, `bg-2`, `bg-3`, `text`, `text-mute`, `text-dim`, `lime`, `line`, `line-2`, `rarity-rare`, `rarity-epic`, `rarity-legendary`. Don't use raw hex values inline.

## What is not yet built (Phase 2+)
- Language type advantage (2× stat bonus based on matchup table)
- Tie carry-over rule (next round worth double)
- XP / coins awarded on battle finish
- Streak tracking
- Starter cards for users with no public repos
- Player vs player matchmaking
- Animations and flavor text ("Pokemon magic")
- League / ranking system
