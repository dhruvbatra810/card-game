# Project Plan

## What this project is

Repo Trumps — a card battle game where GitHub repositories become trading cards. Players sync their GitHub repos, which become cards with stats (stars, forks, age, contributors, activity score). Cards battle each other in a Top Trumps style: pick a stat, compare, highest wins. Currently at MVP (Phase 1).

---

## What is built (Phase 1)

- GitHub OAuth login
- Card sync from GitHub repos with computed stats and rarity
- Bot battle: pick 5 cards, play rounds by choosing stats, first to 3 points wins
- Dashboard: deck builder + battle queue
- Profile page: user stats, card collection with filters, badges, league progress, recent battles

---

## What is not yet built (Phase 2+)

- Language type advantage (2× stat bonus based on matchup table)
- Tie carry-over rule (next round worth double)
- XP / coins awarded on battle finish
- Streak tracking
- Starter cards for users with no public repos
- Player vs player matchmaking
- Animations and flavor text ("Pokemon magic")
- League / ranking system
- Leaderboard page
