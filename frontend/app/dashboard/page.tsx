import { cookies } from 'next/headers'
import DashboardClient from '@/components/dashboard/dashboard-client'
import { type CardData } from '@/components/dashboard/card-grid'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  let initialCards: CardData[] = []
  if (token) {
    try {
      const res = await fetch(`${process.env.API_BASE_URL}/cards`, {
        headers: { Cookie: `token=${token}` },
        cache: 'no-store',
      })
      if (res.ok) initialCards = await res.json()
    } catch {
      // backend unreachable — client will show empty state
    }
  }

  return (
    <div className="px-8 py-8 flex gap-8 h-[calc(100vh-56px)]">
      <DashboardClient initialCards={initialCards} />
    </div>
  )
}
