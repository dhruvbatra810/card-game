'use client'

import type { BattleData } from '@/app/profile/page'

type BadgesPanelProps = {
  userId: number
  league: string
  rating: number
  battles: BattleData[]
}

const LEAGUE_THRESHOLDS: Record<string, { next: string; max: number; min: number }> = {
  bronze:   { min: 0,    max: 1000, next: 'Silver'   },
  silver:   { min: 1000, max: 1500, next: 'Gold'     },
  gold:     { min: 1500, max: 2000, next: 'Platinum' },
  platinum: { min: 2000, max: 2500, next: 'Diamond'  },
  diamond:  { min: 2500, max: 2500, next: 'MAX'      },
}

function getLeagueProgress(league: string, rating: number) {
  const tier = LEAGUE_THRESHOLDS[league] ?? LEAGUE_THRESHOLDS['bronze']
  if (league === 'diamond') {
    return { current: 1, needed: 1, next: 'MAX', rating_to_next: 0 }
  }
  const current = rating - tier.min
  const needed = tier.max - tier.min
  const rating_to_next = tier.max - rating
  return { current, needed, next: tier.next, rating_to_next }
}

type BadgeDefinition = {
  icon: string
  color: string
  unlocked: boolean
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { icon: '♦', color: 'text-cyan',      unlocked: true  },
  { icon: '●', color: 'text-amber',     unlocked: true  },
  { icon: '▲', color: 'text-violet',    unlocked: true  },
  { icon: '✦', color: 'text-lime',      unlocked: true  },
  { icon: '⚡', color: 'text-text-mute', unlocked: false },
  { icon: '★', color: 'text-text-mute', unlocked: false },
  { icon: '◈', color: 'text-text-mute', unlocked: false },
  { icon: '⬡', color: 'text-text-mute', unlocked: false },
  { icon: '⊕', color: 'text-text-mute', unlocked: false },
  { icon: '◉', color: 'text-text-mute', unlocked: false },
]

export default function BadgesPanel({ userId, league, rating, battles }: BadgesPanelProps) {
  const progress = getLeagueProgress(league, rating)
  const pct = Math.round((progress.current / progress.needed) * 100)

  const unlockedCount = BADGE_DEFINITIONS.filter((b) => b.unlocked).length

  // Filter to finished battles, sort descending by date, take 5
  const finishedBattles: BattleData[] = []
  for (const b of battles) {
    if (b.status === 'finished') {
      finishedBattles.push(b)
    }
  }
  finishedBattles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const recentBattles = finishedBattles.slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      {/* Badges */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          BADGES · {unlockedCount} OF {BADGE_DEFINITIONS.length}
        </span>
        <div className="grid grid-cols-5 gap-2">
          {BADGE_DEFINITIONS.map((badge, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-panel border flex items-center justify-center text-base ${
                badge.unlocked
                  ? `border-line-2 bg-bg-3 ${badge.color}`
                  : 'border-line bg-bg opacity-30 text-text-mute'
              }`}
            >
              {badge.icon}
            </div>
          ))}
        </div>
      </div>

      {/* League Progress */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          LEAGUE PROGRESS
        </span>
        <div className="bg-bg-3 border border-line rounded-panel px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-chip font-bold text-cyan uppercase">
              {league}
            </span>
            <span className="font-mono text-chip text-text-mute">
              {rating} / {rating + progress.rating_to_next} ELO
            </span>
          </div>
          <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-line">
            <div
              className="h-full bg-lime rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-chip text-text-mute">
            {progress.rating_to_next > 0
              ? `${progress.rating_to_next} ELO from ${progress.next} promotion`
              : 'MAX LEAGUE'}
          </span>
        </div>
      </div>

      {/* Recent Battles */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          RECENT BATTLES
        </span>
        <div className="flex flex-col bg-bg-3 border border-line rounded-panel overflow-hidden">
          {recentBattles.length === 0 ? (
            <p className="font-mono text-chip text-text-mute px-4 py-3">
              No battles yet.
            </p>
          ) : (
            recentBattles.map((battle) => {
              const won = battle.winner_id === userId
              const score = `${battle.score_player}-${battle.score_opponent}`
              const opponent = battle.opponent_type === 'bot'
                ? 'Bot'
                : `User #${battle.opponent_id}`

              return (
                <div
                  key={battle.id}
                  className="flex items-center justify-between px-4 py-2.5 border-b border-line last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-chip font-bold w-4 text-center ${
                        won ? 'text-lime' : 'text-rose'
                      }`}
                    >
                      {won ? 'W' : 'L'}
                    </span>
                    <span className="font-mono text-chip text-text-dim">
                      vs {opponent}
                    </span>
                  </div>
                  <span className="font-mono text-chip text-text-mute">
                    {score}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
