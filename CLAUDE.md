# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## How to write plans

The user is learning. When writing a plan or explaining an architecture, write it like you're explaining it to someone who is smart but new to the technology:
- Use plain English sentences, not bullet-point jargon
- Explain what will happen step by step ("when the player clicks X, the browser does Y, then the server does Z")
- If you introduce a new tool or concept (Redis, WebSockets, Pub/Sub), explain what it does in one sentence before using it
- Avoid sentences like "leverage the Pub/Sub paradigm" — say "all servers receive the message" instead
- Short paragraphs over dense bullet lists

## Redis vs Database — what goes where

Redis is a scratch pad for **temporary waiting state** only. The real database (Postgres) stores everything permanent.

- Matchmaking queue (player searching) → Redis, deleted when matched or timed out
- Pending round choice (player submitted but opponent hasn't yet) → Redis, deleted after round resolves
- Pub/Sub messages (notify other servers) → Redis, ephemeral (no storage at all)
- Round results, battle results, ratings, XP → **Postgres**, always, same as before

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

See [plan.md](plan.md) for project overview and roadmap.  
See [backend/backend.md](backend/backend.md) for all API routes.  
See [frontend/frontend.md](frontend/frontend.md) for all frontend routes and components.

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

## Keeping docs in sync

Always read [plan.md](plan.md) at the start of every conversation to load project context.

- After any change to a backend route (add, remove, modify) — update [backend/backend.md](backend/backend.md).
- After any change to a frontend page or component (add, remove, modify) — update [frontend/frontend.md](frontend/frontend.md).
- After any change to the project plan or roadmap (features added, phase completed, scope changed) — update [plan.md](plan.md).

## Key conventions

**Cookie auth:** The JWT token lives in a cookie named `token`. The frontend reads it with a regex (`/(?:^|; )token=([^;]*)/)`) to handle `=` padding in the JWT. Don't use `.split('=')[1]` — it truncates base64-padded tokens.

**httpx calls to GitHub:** Always set `timeout=10` and call `.raise_for_status()`. Wrap in try/except for `httpx.HTTPError` and `httpx.TimeoutException`. One failed repo should not abort the whole sync — use `continue`.

**Tailwind theme:** Custom colors are defined in `frontend/app/globals.css`. Use semantic names: `bg`, `bg-2`, `bg-3`, `text`, `text-mute`, `text-dim`, `lime`, `line`, `line-2`, `rarity-rare`, `rarity-epic`, `rarity-legendary`. Don't use raw hex values inline.
