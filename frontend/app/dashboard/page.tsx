import { cookies } from 'next/headers'
import DashboardClient from '@/components/dashboard/dashboard-client'
import { type CardData } from '@/components/dashboard/card-grid'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  const apiBase = process.env.API_BASE_URL
  if (!apiBase) {
    throw new Error('API_BASE_URL is not set. Add it to frontend/.env (server-side only, not exposed to browser).')
  }

  let initialCards: CardData[] = []
  if (token) {
    try {
      const res = await fetch(`${apiBase}/cards`, {
        headers: { Cookie: `token=${token}` },
        cache: 'no-store',
      })
      if (res.ok) initialCards = await res.json()
    } catch (err) {
      console.error(`[dashboard] Failed to fetch cards from ${apiBase}/cards:`, err)
      // backend unreachable — client will show empty state
    }
  }

  return (
    <div className="px-8 py-8 flex gap-8 h-[calc(100vh-56px)]">
      <DashboardClient initialCards={initialCards} />
    </div>
  )
}
