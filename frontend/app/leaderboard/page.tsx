import { cookies } from 'next/headers'
import LeaderboardClient from './leaderboard-client'

export type LeaderboardEntry = {
  rank: number
  id: number
  username: string
  avatar_url: string | null
  wins: number
  losses: number
  rating: number
  current_streak: number
  league: string
}

export type LeaderboardData = {
  entries: LeaderboardEntry[]
  total: number
}

export type CurrentUser = {
  id: number
  username: string
  wins: number
  losses: number
  rating: number
  current_streak: number
  league: string
}

export default async function LeaderboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  const apiBase = process.env.API_BASE_URL
  if (!apiBase) throw new Error('API_BASE_URL is not set')

  if (!token) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-56px)] font-mono text-chip text-text-mute">
        Please log in to view the leaderboard.
      </div>
    )
  }

  const headers = { Cookie: `token=${token}` }
  const opts = { headers, cache: 'no-store' as const }

  const userRes = await fetch(`${apiBase}/users/me`, opts)
  if (!userRes.ok) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-56px)] font-mono text-chip text-text-mute">
        Failed to load profile.
      </div>
    )
  }
  const user: CurrentUser = await userRes.json()

  const leaderboardRes = await fetch(`${apiBase}/leaderboard?league=${user.league}`, opts)
  const initialData: LeaderboardData = leaderboardRes.ok
    ? await leaderboardRes.json()
    : { entries: [], total: 0 }

  return (
    <LeaderboardClient user={user} initialLeague={user.league} initialData={initialData} />
  )
}
