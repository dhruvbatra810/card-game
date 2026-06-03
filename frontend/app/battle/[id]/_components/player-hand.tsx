import Card, { type CardData } from '@/components/card'

interface PlayerHandProps {
  myCards: CardData[]
  usedCardIds: number[]
  activeCard: CardData | null
  canPick: boolean
  onCardPick: (card: CardData) => void
}

export default function PlayerHand({
  myCards,
  usedCardIds,
  activeCard,
  canPick,
  onCardPick,
}: PlayerHandProps) {
  const availableCards = myCards.filter((c) => !usedCardIds.includes(c.id))

  return (
    <div className="w-72 shrink-0 flex flex-col border-l border-line overflow-hidden">

      {/* Active card — fixed, never scrolls away */}
      <div className="shrink-0 flex flex-col gap-4 p-6 pb-2">
        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          Your Active Card
        </span>
        {activeCard ? (
          <Card card={activeCard} selected />
        ) : (
          <div className="w-48 rounded-card border-2 border-dashed border-line flex items-center justify-center h-72 text-text-mute font-mono text-chip text-center px-4">
            Pick a card below
          </div>
        )}
      </div>

      {/* Hand list — scrollable */}
      <div className="flex flex-col gap-4 px-6 pb-6 flex-1 overflow-y-auto mt-2">
        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          Remaining in Hand
        </span>
        <div className="flex flex-col gap-2">

          {availableCards.map((card) => {
            const isActive = activeCard?.id === card.id
            const parts = card.repo_name?.split('/') ?? []
            const repo = parts[1] ?? parts[0] ?? 'unknown'
            const hp = (card.stars ?? 0) + (card.forks ?? 0) + Math.round((card.age_years ?? 0) * 10) + (card.contributors ?? 0)

            return (
              <button
                key={card.id}
                onClick={() => canPick && onCardPick(card)}
                disabled={!canPick}
                className={`flex items-center gap-2 rounded-panel border px-3 py-2 text-left transition-all font-mono ${
                  isActive
                    ? 'border-lime bg-bg-3'
                    : canPick
                    ? 'border-line bg-bg-3 hover:border-lime cursor-pointer'
                    : 'border-line bg-bg-3 opacity-50 cursor-default'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-chip font-bold text-text truncate">{repo}</p>
                  <p className="text-[10px] text-text-mute uppercase">{card.rarity} · HP {hp}</p>
                </div>
              </button>
            )
          })}

          {usedCardIds.map((id) => {
            const card = myCards.find((c) => c.id === id)
            if (!card) return null
            const parts = card.repo_name?.split('/') ?? []
            const repo = parts[1] ?? parts[0] ?? 'unknown'
            return (
              <div key={id} className="flex items-center gap-2 rounded-panel border border-line bg-bg-3 px-3 py-2 opacity-30 cursor-default font-mono">
                <div className="flex-1 min-w-0">
                  <p className="text-chip font-bold text-text-mute truncate line-through">{repo}</p>
                  <p className="text-[10px] text-text-mute uppercase">Used</p>
                </div>
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}
