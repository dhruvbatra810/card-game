'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Card, { type CardData } from '@/components/card'

export type { CardData }

type CardGridProps = {
  cards: CardData[]
  onSelectionChange: (selected: CardData[]) => void
}

export default function CardGrid({ cards, onSelectionChange }: CardGridProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  function toggle(card: CardData) {
    if (selectedIds.includes(card.id)) {
      const next = selectedIds.filter((id) => id !== card.id)
      setSelectedIds(next)
      onSelectionChange(cards.filter((c) => next.includes(c.id)))
    } else {
      if (selectedIds.length >= 5) {
        toast.error('Max 5 cards — remove one first')
        return
      }
      const next = [...selectedIds, card.id]
      setSelectedIds(next)
      onSelectionChange(cards.filter((c) => next.includes(c.id)))
    }
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(192px, 1fr))' }}>
      {cards.map((card) => {
        const selIndex = selectedIds.indexOf(card.id)
        const isSelected = selIndex !== -1
return (
          <div key={card.id} className="relative">
            <Card card={card} selected={isSelected} onClick={() => toggle(card)} />
            {isSelected && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-lime text-bg font-mono font-bold text-[10px] flex items-center justify-center z-10">
                {selIndex + 1}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
