import { cookies } from 'next/headers'
import ProfileClient from '@/components/profile/profile-client'
import { type CardData } from '@/components/card'

export type UserData = {
  id: number
  username: string
  email: string | null
  avatar_url: string | null
  wins: number
  losses: number
  best_streak: number
  current_streak: number
  xp: number
  coins: number
  created_at: string
}

export type BattleData = {
  id: number
  player_id: number
  opponent_type: string
  opponent_id: number | null
  score_player: number
  score_opponent: number
  winner_id: number | null
  status: string
  created_at: string
  finished_at: string | null
}

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  const apiBase = process.env.API_BASE_URL
  if (!apiBase) {
    throw new Error('API_BASE_URL is not set. Add it to frontend/.env (server-side only, not exposed to browser).')
  }

  let user: UserData | null = null
  let cards: CardData[] = []
  let battles: BattleData[] = []

  if (token) {
    try {
      const res = await fetch(`${apiBase}/users/me`, {
        headers: { Cookie: `token=${token}` },
        cache: 'no-store',
      })
      if (res.ok) user = await res.json()
    } catch (err) {
      console.error(`[profile] Failed to fetch user from ${apiBase}/users/me:`, err)
    }

    try {
      const res = await fetch(`${apiBase}/cards`, {
        headers: { Cookie: `token=${token}` },
        cache: 'no-store',
      })
      if (res.ok) cards = await res.json()
    } catch (err) {
      console.error(`[profile] Failed to fetch cards from ${apiBase}/cards:`, err)
    }

    try {
      const res = await fetch(`${apiBase}/battles`, {
        headers: { Cookie: `token=${token}` },
        cache: 'no-store',
      })
      if (res.ok) battles = await res.json()
    } catch (err) {
      console.error(`[profile] Failed to fetch battles from ${apiBase}/battles:`, err)
    }
  }

  return (
    <ProfileClient user={user} cards={cards} battles={battles} />
  )
}
