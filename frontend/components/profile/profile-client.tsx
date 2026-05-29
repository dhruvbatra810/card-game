'use client'

import type { CardData } from '@/components/card'
import type { UserData, BattleData } from '@/app/profile/page'
import StatsBar from '@/components/profile/stats-bar'
import CardCollection from '@/components/profile/card-collection'
import BadgesPanel from '@/components/profile/badges-panel'
import {
  getXpLevel,
  getPowerScore,
  formatJoinDate,
} from '@/components/profile/profile-utils'

type ProfileClientProps = {
  user: UserData | null
  cards: CardData[]
  battles: BattleData[]
}

export default function ProfileClient({ user, cards, battles }: ProfileClientProps) {
  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-56px)] font-mono text-chip text-text-mute">
        Please log in to view your profile.
      </div>
    )
  }

  const totalBattles = user.wins + user.losses
  const xpLevel = getXpLevel(user.xp)
  const powerScore = getPowerScore(cards, user.wins)
  const joinDate = formatJoinDate(user.created_at)
  const initials = user.username.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden px-8 py-6 gap-6">

      {/* Row 1 — header band */}
      <div className="flex items-center gap-6 shrink-0">
        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-full bg-violet flex items-center justify-center font-bold text-h3 text-bg shrink-0"
          style={{ boxShadow: '0 0 20px 4px rgba(180,140,255,0.35)' }}
        >
          {initials}
        </div>

        {/* Name + badges + subtext */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <h1 className="font-display font-bold text-h2 text-text leading-tight">
            {user.username}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-chip bg-bg-3 border border-line-2 rounded-badge px-2 py-1 text-cyan uppercase">
              {user.league} · {user.rating} ELO
            </span>
            {user.current_streak >= 3 && (
              <span className="font-mono text-chip bg-bg-3 border border-amber rounded-badge px-2 py-1 text-amber uppercase">
                {user.current_streak}-WIN STREAK
              </span>
            )}
          </div>
          <p className="font-mono text-chip text-text-mute">
            @{user.username} · joined {joinDate} · power score {powerScore.toLocaleString()}
          </p>
        </div>

        {/* Stats bar — fills remaining width */}
        <div className="flex-1 min-w-0">
          <StatsBar
            battles={totalBattles}
            wins={user.wins}
            losses={user.losses}
            bestStreak={user.best_streak}
            xpLevel={xpLevel}
          />
        </div>
      </div>

      {/* Row 2 — content */}
      <div className="flex gap-6 flex-1 min-h-0">

        {/* Card grid — scrolls independently */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-2">
          <CardCollection cards={cards} />
        </div>

        {/* Right sidebar — can scroll if content overflows */}
        <div className="w-64 shrink-0 overflow-y-auto">
          <BadgesPanel userId={user.id} wins={user.wins} battles={battles} />
        </div>

      </div>
    </div>
  )
}
