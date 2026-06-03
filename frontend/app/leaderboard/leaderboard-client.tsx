'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LeaderboardEntry, LeaderboardData, CurrentUser } from './page'

const LEAGUES = [
  { id: 'bronze',   label: 'Bronze',   color: 'text-amber',  dot: 'bg-amber',  activeBorder: 'border-b-amber'  },
  { id: 'silver',   label: 'Silver',   color: 'text-cyan',   dot: 'bg-cyan',   activeBorder: 'border-b-cyan'   },
  { id: 'gold',     label: 'Gold',     color: 'text-lime',   dot: 'bg-lime',   activeBorder: 'border-b-lime'   },
  { id: 'platinum', label: 'Platinum', color: 'text-violet', dot: 'bg-violet', activeBorder: 'border-b-violet' },
  { id: 'diamond',  label: 'Diamond',  color: 'text-rose',   dot: 'bg-rose',   activeBorder: 'border-b-rose'   },
]

const AVATAR_COLORS = [
  'bg-lime text-bg',
  'bg-cyan text-bg',
  'bg-violet text-bg',
  'bg-amber text-bg',
  'bg-rose text-bg',
]

function getAvatarColor(username: string): string {
  return AVATAR_COLORS[username.charCodeAt(0) % AVATAR_COLORS.length]
}

function Avatar({ username, size = 'md' }: { username: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = getAvatarColor(username)
  const initials = username.slice(0, 2).toUpperCase()
  const sizeClass =
    size === 'lg' ? 'w-14 h-14 text-h3' :
    size === 'md' ? 'w-10 h-10 text-btn' :
                   'w-8 h-8 text-chip'
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-display font-bold shrink-0`}>
      {initials}
    </div>
  )
}

type Props = {
  user: CurrentUser
  initialLeague: string
  initialData: LeaderboardData
}

export default function LeaderboardClient({ user, initialLeague, initialData }: Props) {
  const [selectedLeague, setSelectedLeague] = useState(initialLeague)
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialData.entries)
  const [total, setTotal] = useState(initialData.total)
  const [isLoading, setIsLoading] = useState(false)

  const myRankIdx = initialData.entries.findIndex(e => e.id === user.id)
  const myRank = myRankIdx === -1 ? null : myRankIdx + 1
  const myTotal = initialData.total

  const winRate = user.wins + user.losses === 0
    ? 0
    : Math.round((user.wins / (user.wins + user.losses)) * 100)

  const leagueCfg = LEAGUES.find(l => l.id === selectedLeague) ?? LEAGUES[1]
  const myLeagueCfg = LEAGUES.find(l => l.id === user.league) ?? LEAGUES[1]

  async function handleTabChange(league: string) {
    if (league === selectedLeague) return
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/leaderboard?league=${league}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const data = await res.json()
        setSelectedLeague(league)
        setEntries(data.entries)
        setTotal(data.total)
      } else {
        setEntries([])
        setTotal(0)
      }
    } catch {
      setEntries([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  // Podium order: 2nd left, 1st center, 3rd right
  const podium = [top3[1], top3[0], top3[2]]

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden px-8 py-6 gap-5 min-w-0">

        <h1 className="font-display font-bold text-h2 text-text shrink-0">Leaderboard</h1>

        {/* League tabs */}
        <div className="flex items-center border-b border-line shrink-0">
          {LEAGUES.map(l => {
            const isActive = selectedLeague === l.id
            return (
              <button
                key={l.id}
                onClick={() => handleTabChange(l.id)}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 font-mono text-chip font-medium
                  transition-colors border-b-2 -mb-px
                  ${isActive
                    ? `${l.color} ${l.activeBorder}`
                    : 'text-text-mute border-transparent hover:text-text-dim'
                  }
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-sm ${isActive ? l.dot : 'bg-text-mute'}`} />
                {l.label.toUpperCase()}
              </button>
            )
          })}
        </div>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-5 pr-1">

          {isLoading && (
            <div className="flex items-center justify-center py-20 font-mono text-chip text-text-mute">
              Loading...
            </div>
          )}

          {!isLoading && entries.length === 0 && (
            <div className="flex items-center justify-center py-20 font-mono text-chip text-text-mute">
              No players in {leagueCfg.label} yet.
            </div>
          )}

          {!isLoading && entries.length > 0 && (
            <>
              {/* Podium — top 3 */}
              <div className="flex items-end justify-center gap-4 py-6">
                {podium.map((entry, i) => {
                  if (!entry) return <div key={i} className="w-44" />
                  const isFirst = entry.rank === 1
                  const isMe = entry.id === user.id
                  return (
                    <div
                      key={entry.id}
                      className={`
                        relative flex flex-col items-center gap-3 rounded-card border p-5
                        ${isFirst ? 'pb-8 w-52' : 'w-44'}
                        ${isMe ? 'border-lime' : isFirst ? 'border-amber/60' : 'border-line'}
                        bg-bg-2
                      `}
                    >
                      {isFirst && (
                        <span className="absolute -top-5 text-2xl select-none">👑</span>
                      )}
                      {/* Rank badge */}
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center font-mono text-chip font-bold
                        ${isFirst ? 'bg-amber text-bg' : 'bg-bg-3 text-text-mute border border-line'}
                      `}>
                        {entry.rank}
                      </div>
                      <Avatar username={entry.username} size={isFirst ? 'lg' : 'md'} />
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-display font-semibold text-btn ${isMe ? 'text-lime' : 'text-text'}`}>
                          {entry.username}
                        </span>
                        <span className={`font-mono font-bold ${isFirst ? 'text-h3' : 'text-btn'} ${leagueCfg.color}`}>
                          {entry.wins}W
                        </span>
                        {entry.current_streak > 0 && (
                          <span className="font-mono text-chip text-amber">
                            🔥 {entry.current_streak} streak
                          </span>
                        )}
                        <span className="font-mono text-chip text-text-mute">
                          {entry.rating} ELO
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Table — rank 4+ */}
              {rest.length > 0 && (
                <div className="rounded-panel border border-line overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-line bg-bg-2">
                        <th className="text-left px-5 py-3 font-mono text-chip text-text-mute w-16">RANK</th>
                        <th className="text-left px-5 py-3 font-mono text-chip text-text-mute">PLAYER</th>
                        <th className="text-right px-5 py-3 font-mono text-chip text-text-mute">W / L</th>
                        <th className="text-right px-5 py-3 font-mono text-chip text-text-mute">STREAK</th>
                        <th className="text-right px-5 py-3 font-mono text-chip text-text-mute">RATING</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map(entry => {
                        const isMe = entry.id === user.id
                        return (
                          <tr
                            key={entry.id}
                            className={`
                              border-b border-line last:border-0
                              ${isMe ? 'bg-lime/5' : 'hover:bg-bg-2'}
                              transition-colors
                            `}
                          >
                            <td className="px-5 py-3 font-mono text-chip text-text-mute">
                              {entry.rank}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar username={entry.username} size="sm" />
                                <span className={`font-display text-btn ${isMe ? 'text-lime' : 'text-text'}`}>
                                  {entry.username}
                                </span>
                                {isMe && (
                                  <span className="font-mono text-chip text-text-mute">(you)</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-chip">
                              <span className="text-lime">{entry.wins}</span>
                              <span className="text-text-mute"> / </span>
                              <span className="text-text-dim">{entry.losses}</span>
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-chip">
                              {entry.current_streak > 0
                                ? <span className="text-amber">🔥 {entry.current_streak}</span>
                                : <span className="text-text-mute">—</span>
                              }
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-chip text-text-dim">
                              {entry.rating}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-72 shrink-0 border-l border-line flex flex-col gap-5 px-5 py-6 overflow-y-auto">

        <h2 className="font-mono text-chip text-text-mute tracking-widest uppercase shrink-0">
          Your Standing
        </h2>

        {/* User card */}
        <div className="bg-bg-2 border border-line-2 rounded-panel p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet text-bg rounded-full flex items-center justify-center font-display font-bold text-btn shrink-0">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-semibold text-btn text-text truncate">{user.username}</span>
              <span className={`font-mono text-chip ${myLeagueCfg.color}`}>
                • {myLeagueCfg.label} League
              </span>
            </div>
          </div>

          {myRank !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-h2 text-lime">#{myRank}</span>
              <span className="font-mono text-chip text-text-mute">of {myTotal} in {myLeagueCfg.label}</span>
            </div>
          ) : (
            <p className="font-mono text-chip text-text-mute">Not ranked yet — play a match!</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-2 border border-line rounded-panel p-3 flex flex-col gap-1">
            <span className="font-mono text-chip text-text-mute uppercase">Season Wins</span>
            <span className="font-display font-bold text-h3 text-lime">{user.wins}</span>
          </div>
          <div className="bg-bg-2 border border-line rounded-panel p-3 flex flex-col gap-1">
            <span className="font-mono text-chip text-text-mute uppercase">Streak</span>
            <span className="font-display font-bold text-h3 text-amber">
              {user.current_streak > 0 ? `🔥 ${user.current_streak}` : '—'}
            </span>
          </div>
          <div className="bg-bg-2 border border-line rounded-panel p-3 flex flex-col gap-1">
            <span className="font-mono text-chip text-text-mute uppercase">Rating</span>
            <span className="font-display font-bold text-h3 text-violet">{user.rating}</span>
          </div>
          <div className="bg-bg-2 border border-line rounded-panel p-3 flex flex-col gap-1">
            <span className="font-mono text-chip text-text-mute uppercase">Win Rate</span>
            <span className="font-display font-bold text-h3 text-cyan">{winRate}%</span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn hover:brightness-110 transition-all shadow-lime-glow mt-auto"
        >
          Find a Match →
        </Link>

      </div>
    </div>
  )
}
