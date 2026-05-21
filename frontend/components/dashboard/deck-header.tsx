'use client'

import { useState } from 'react'
import type { CardData } from './card-grid'

type DeckHeaderProps = {
  cardCount: number
  onSortChange: (cards: CardData[]) => void
  cards: CardData[]
  onFetch: () => void
}

const SORT_FIELDS: { label: string; key: keyof CardData }[] = [
  { label: 'Sort by stars', key: 'stars' },
  { label: 'Sort by forks', key: 'forks' },
  { label: 'Sort by age', key: 'age_years' },
]

export default function DeckHeader({ cardCount, onSortChange, cards, onFetch }: DeckHeaderProps) {
  const [sortIndex, setSortIndex] = useState(0)

  function handleSort() {
    const next = (sortIndex + 1) % SORT_FIELDS.length
    setSortIndex(next)
    const field = SORT_FIELDS[next].key
    const sorted = [...cards].sort((a, b) => (b[field] as number) - (a[field] as number))
    onSortChange(sorted)
  }


  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          Your Deck · {cardCount} Cards
        </span>
        <h1 className="font-display font-bold text-h2 text-text mt-1">Build your battle deck</h1>
        <p className="text-lede text-text-dim mt-1">Pick 5 cards to take into battle. Tap a card to toggle it.</p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={onFetch}
          className="flex items-center gap-2 px-4 py-2 rounded-ctrl border border-line bg-bg-3 font-display text-btn text-text-dim hover:text-text hover:border-line-2 transition-colors"
        >
          ↻ Fetch from GitHub
        </button>
        <button
          onClick={handleSort}
          className="flex items-center gap-2 px-4 py-2 rounded-ctrl border border-line bg-bg-3 font-display text-btn text-text-dim hover:text-text hover:border-line-2 transition-colors"
        >
          ↕ {SORT_FIELDS[sortIndex].label}
        </button>
      </div>
    </div>
  )
}
