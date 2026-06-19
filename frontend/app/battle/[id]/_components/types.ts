export const STATS: { key: string; label: string }[] = [
  { key: 'stars',          label: 'STARS' },
  { key: 'forks',          label: 'FORKS' },
  { key: 'age_years',      label: 'AGE' },
  { key: 'contributors',   label: 'CONTRIB' },
  { key: 'activity_score', label: 'ACTIVITY' },
]

export type RoundResult = {
  id: number
  round_number: number
  p1_card_id: number
  p2_card_id: number
  stat_chosen: string
  winner_id: number | null
  was_tie: boolean
  was_critical: boolean
  type_advantage: boolean
  flavor_text: string | null
  points_awarded: number
  xp: number
  coins: number
}

export type PvpRoundResult = {
  winner_id: number | null
  i_won: boolean
  score_me: number
  score_opp: number
  my_card_id: number
  opp_card_id: number
  stat_chosen: string
  was_tie: boolean
  was_critical: boolean
  type_advantage: boolean
  flavor_text: string | null
  points_awarded: number
  i_pick_next: boolean
}

export type BattleState = {
  id: number
  score_player: number
  score_opponent: number
  status: string
  winner_id: number | null
}

export type BotPhase =
  | 'pick-card'
  | 'pick-stat'
  | 'submitting'
  | 'result'
  | 'bot-picking'
  | 'finished'

export type PvpPhase =
  | 'pick-card'
  | 'pick-stat'
  | 'waiting-for-opponent'
  | 'pvp-result'
  | 'opponent-left'
  | 'finished'

export function formatStatValue(key: string, value: number): string {
  if (key === 'age_years') return `${value}y`
  if (key === 'activity_score') {
    if (value >= 70) return 'High'
    if (value >= 30) return 'Mid'
    return 'Low'
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

import type { CardData } from '@/components/card'

export function getRawStat(card: CardData, key: string): number {
  return (card as unknown as Record<string, number>)[key] ?? 0
}
