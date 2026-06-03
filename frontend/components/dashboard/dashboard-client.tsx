'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import CardGrid, { type CardData } from './card-grid'
import BattleQueue from './battle-queue'
import DeckHeader from './deck-header'

const API = process.env.NEXT_PUBLIC_API_BASE_URL

export default function DashboardClient({ initialCards }: { initialCards: CardData[] }) {
  const [cards, setCards] = useState<CardData[]>(initialCards)
  const [selected, setSelected] = useState<CardData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    toast.dismiss()
  }, [])

  function handleRemove(id: number) {
    setSelected((prev) => prev.filter((c) => c.id !== id))
  }

  function handleFetch() {
    setLoading(true)
    fetch(`${API}/cards/sync`, { method: 'POST', credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setCards(data))
      .finally(() => setLoading(false))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-text-mute">
        Loading cards...
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        <DeckHeader cardCount={cards.length} cards={cards} onSortChange={setCards} onFetch={handleFetch} />
        <div className="flex-1 border border-line rounded-panel overflow-hidden flex flex-col min-h-0">
          <p className="font-mono text-chip text-text-mute text-center py-3 tracking-widest border-b border-line shrink-0">
            // PULLED FROM YOUR REPOS
          </p>
          <div className="flex-1 overflow-y-auto p-6">
            <CardGrid cards={cards} onSelectionChange={setSelected} />
          </div>
        </div>
      </div>
      <BattleQueue selected={selected} onRemove={handleRemove} />
    </>
  )
}
