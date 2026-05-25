# Backend API Routes

Base URL: `http://localhost:8000`

All protected routes require a JWT token sent as a cookie (`token=...`).

---

## Auth — `routes/auth.py`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/auth/github` | No | Returns the GitHub OAuth redirect URL. Frontend opens this URL to start login. |
| GET | `/auth/github/callback?code=...` | No | Exchanges the GitHub OAuth code for an access token, creates or updates the User row, issues a JWT. Returns `{ access_token, token_type }`. |

---

## Users — `routes/users.py`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/users/me` | Yes | Returns the current logged-in user's profile: id, username, email, avatar_url, wins, losses, best_streak, current_streak, xp, coins, created_at. |

---

## Cards — `routes/cards.py`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/cards/sync` | Yes | Fetches the user's GitHub repos, computes stats (stars, forks, age, activity score), upserts them into the Card table. Returns the full updated card list. |
| GET | `/cards` | Yes | Returns all cards belonging to the current user. |
| GET | `/cards/{card_id}/public` | Yes | Returns a single card by ID (used to fetch the bot's revealed card during a battle). |
| DELETE | `/cards/{card_id}` | Yes | Deletes a card owned by the current user. |

---

## Battles — `routes/battle.py`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/battles` | Yes | Creates a new Battle row with status `in_progress`. Returns the Battle object. |
| GET | `/battles` | Yes | Returns all battles where the current user is the player or opponent. |
| GET | `/battles/{id}` | Yes | Returns a single battle by ID (must belong to the current user). |
| POST | `/battles/{id}/round` | Yes | Plays one round. Body: `{ p1_card_id, stat_chosen }`. Bot picks a random card and the player's chosen stat is compared. Awards 1 point (or 2 on critical hit: win margin ≥ 10×). Returns the Round object. |

---

## Stat computation notes

- **activity_score**: `max(0, 100 - days_since_last_push)` — drops to 0 after 100 days of inactivity.
- **age_years**: `(today - repo_created_at).days / 365`, rounded to 2 decimal places.
- **Rarity**: assigned on card creation based on combined stats (stars, forks, age, contributors, activity).
- **Critical hit**: triggered when `max(p1_val, p2_val) >= min(p1_val, p2_val) * 10` — awards 2 points instead of 1.
