# Frontend Routes

Dev server: `http://localhost:3000`

---

## Pages — `app/`

| Route | File | Type | Description |
|-------|------|------|-------------|
| `/` | `app/page.tsx` | Server | Landing page. Shows hero copy + 3 stacked demo cards. Has GitHub login button. |
| `/dashboard` | `app/dashboard/page.tsx` | Server | Deck builder. Fetches the user's cards server-side, passes them to `DashboardClient`. Shows card grid + battle queue sidebar. |
| `/profile` | `app/profile/page.tsx` | Server | Profile page. Fetches `/users/me`, `/cards`, `/battles` server-side, passes to `ProfileClient`. Shows user header, card collection with filters, badges/league/recent battles. |
| `/battle/[id]` | `app/battle/[id]/page.tsx` | Client | Live battle screen. Loads battle state and the user's selected cards, then runs round-by-round play against the bot. Card pick → stat pick → result → next round → finish. |
| `/auth/github/callback` | `app/auth/github/callback/page.tsx` | Client | OAuth landing. Reads `?code=` from the URL, sends it to the backend, stores the returned JWT as a cookie, then redirects to `/`. |

---

## Key components — `components/`

| Component | Description |
|-----------|-------------|
| `navbar.tsx` | Top nav bar. Fetches `/users/me` on mount to show XP/coins and nav links when logged in. |
| `card.tsx` | Core card UI. Accepts `CardData` props. Shows repo name, language badge, stats, rarity glow. Optionally `selected` (lime border) and `onClick`. |
| `card-back.tsx` | Face-down card placeholder used in the battle screen before the bot card is revealed. |
| `login-button.tsx` | Reads the `token` cookie. Shows "Sign in with GitHub" or "Battle" depending on login state. |
| `footer.tsx` | Simple static footer. |
| `dashboard/dashboard-client.tsx` | Client wrapper for the dashboard. Owns selected cards state, calls `/cards/sync`, renders `DeckHeader` + `CardGrid` + `BattleQueue`. |
| `dashboard/card-grid.tsx` | Scrollable grid of cards. Handles selection (up to 5), shows lime selection index badge. |
| `dashboard/deck-header.tsx` | Sticky header above the card grid. Has "Fetch from GitHub" and "Sort" buttons. |
| `dashboard/battle-queue.tsx` | Right sidebar. Shows 5 card slots, selected cards list, league info, and "Start Battle" button. Creates the battle via `POST /battles` then navigates to `/battle/[id]`. |
| `profile/profile-client.tsx` | Client assembler for the profile page. Two-row layout: header band (avatar + name + stats) on top, card grid + sidebar below. |
| `profile/stats-bar.tsx` | Horizontal row of stat chips: BATTLES, WINS, LOSSES, BEST STREAK, XP LEVEL. |
| `profile/card-collection.tsx` | Filterable card grid on the profile page. Filter chips by rarity. Card grid scrolls independently. |
| `profile/badges-panel.tsx` | Right sidebar on profile. Shows badge slots, league progress bar, recent finished battles. |
| `profile/profile-utils.ts` | Pure helper functions: `getLeagueTier`, `getLeagueProgress`, `getXpLevel`, `getPowerScore`, `formatJoinDate`, `getRankFromWins`. |

---

## Auth & data fetching conventions

- **Cookie auth**: JWT stored in a cookie named `token`. Read with regex `/(?:^|; )token=([^;]*)/` — never `.split('=')[1]` (truncates base64 padding).
- **Server Components** (`/dashboard`, `/profile`): read cookie via `cookies()` from `next/headers`, fetch backend directly, pass data as props to Client Components. Do not move these fetches client-side.
- **Client Components**: use `credentials: 'include'` on all fetch calls so the cookie is forwarded automatically.
- **Tailwind theme**: use semantic color names from `app/globals.css` (`bg`, `bg-2`, `bg-3`, `text`, `text-mute`, `lime`, `line`, `rarity-rare`, etc.). No raw hex values inline.
