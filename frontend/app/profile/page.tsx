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
  rating: number
  league: string
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
    const headers = { Cookie: `token=${token}` }
    const opts = { headers, cache: 'no-store' as const }

    const userPromise = fetch(`${apiBase}/users/me`, opts)
    const cardsPromise = fetch(`${apiBase}/cards`, opts)
    const battlesPromise = fetch(`${apiBase}/battles`, opts)

    const [userResult, cardsResult, battlesResult] = await Promise.allSettled([
      userPromise,
      cardsPromise,
      battlesPromise,
    ])

    if (userResult.status === 'fulfilled') {
      if (userResult.value.ok) user = await userResult.value.json()
    } else {
      console.error(`[profile] Failed to fetch user from ${apiBase}/users/me:`, userResult.reason)
    }

    if (cardsResult.status === 'fulfilled') {
      if (cardsResult.value.ok) cards = await cardsResult.value.json()
    } else {
      console.error(`[profile] Failed to fetch cards from ${apiBase}/cards:`, cardsResult.reason)
    }

    if (battlesResult.status === 'fulfilled') {
      if (battlesResult.value.ok) battles = await battlesResult.value.json()
    } else {
      console.error(`[profile] Failed to fetch battles from ${apiBase}/battles:`, battlesResult.reason)
    }
  }

  return (
    <ProfileClient user={user} cards={cards} battles={battles} />
  )
}
