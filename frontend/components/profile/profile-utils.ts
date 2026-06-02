import type { CardData } from '@/components/card'

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
