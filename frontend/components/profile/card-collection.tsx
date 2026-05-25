'use client'

import { useState } from 'react'
import Card, { type CardData, type Rarity } from '@/components/card'

type CardCollectionProps = {
  cards: CardData[]
}

type FilterKey = 'all' | Rarity

export default function CardCollection({ cards }: CardCollectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  let legendaryCount = 0
  let epicCount = 0
  let rareCount = 0
  let commonCount = 0
  let uncommonCount = 0

  for (const card of cards) {
    if (card.rarity === 'legendary') legendaryCount++
    else if (card.rarity === 'epic') epicCount++
    else if (card.rarity === 'rare') rareCount++
    else if (card.rarity === 'uncommon') uncommonCount++
    else commonCount++
  }

  let filteredCards: CardData[]
  if (activeFilter === 'all') {
    filteredCards = cards
  } else {
    filteredCards = []
    for (const card of cards) {
      if (card.rarity === activeFilter) {
        filteredCards.push(card)
      }
    }
  }

  type FilterOption = { key: FilterKey; label: string }

  const filters: FilterOption[] = [
    { key: 'all', label: 'ALL' },
    { key: 'legendary', label: `${legendaryCount} LEG` },
    { key: 'epic', label: `${epicCount} EPIC` },
    { key: 'rare', label: `${rareCount} RARE` },
    { key: 'uncommon', label: `${uncommonCount} UNCOMMON` },
    { key: 'common', label: `${commonCount} COMMON` },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          CARD COLLECTION — {filteredCards.length} OF {cards.length}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`font-mono text-chip px-3 py-1.5 rounded-badge border transition-colors ${
                activeFilter === f.key
                  ? 'bg-lime text-bg border-lime'
                  : 'bg-bg-3 border-line text-text-mute hover:border-line-2 hover:text-text-dim'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      {cards.length === 0 ? (
        <p className="font-mono text-chip text-text-mute text-center py-12">
          No cards yet. Go to your deck and sync from GitHub.
        </p>
      ) : filteredCards.length === 0 ? (
        <p className="font-mono text-chip text-text-mute text-center py-12">
          No {activeFilter} cards in your collection.
        </p>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(192px, 1fr))' }}
        >
          {filteredCards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  )
}
