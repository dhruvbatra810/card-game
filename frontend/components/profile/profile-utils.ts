import type { CardData } from '@/components/card'

export function getLeagueTier(wins: number): string {
  if (wins >= 20) return 'Platinum'
  if (wins >= 10) return 'Gold'
  if (wins >= 5) return 'Silver'
  return 'Bronze'
}

export type LeagueProgress = {
  current: number
  needed: number
  next: string
  wins_to_next: number
}

export function getLeagueProgress(wins: number): LeagueProgress {
  if (wins >= 20) {
    return { current: 10, needed: 10, next: 'MAX', wins_to_next: 0 }
  }
  if (wins >= 10) {
    const current = wins - 10
    return { current, needed: 10, next: 'Platinum', wins_to_next: 10 - current }
  }
  if (wins >= 5) {
    const current = wins - 5
    return { current, needed: 5, next: 'Gold', wins_to_next: 5 - current }
  }
  return { current: wins, needed: 5, next: 'Silver', wins_to_next: 5 - wins }
}

export function getXpLevel(xp: number): number {
  return Math.floor(xp / 50) + 1
}

export function getPowerScore(cards: CardData[], wins: number): number {
  let starsSum = 0
  let forksSum = 0
  for (const card of cards) {
    starsSum += card.stars
    forksSum += card.forks
  }
  return starsSum + forksSum * 2 + wins * 10
}

export function formatJoinDate(created_at: string): string {
  const d = new Date(created_at)
  return d.toLocaleString('default', { month: 'long', year: 'numeric' })
}

export function getRankFromWins(wins: number): number {
  const rank = 100 - wins * 3
  if (rank < 1) return 1
  return rank
}
