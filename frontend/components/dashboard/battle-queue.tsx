'use client'

import { useRouter } from 'next/navigation'
import type { CardData } from './card-grid'

type BattleQueueProps = {
  selected: CardData[]
  onRemove: (id: number) => void
}

const RARITY_COLOR: Record<string, string> = {
  common: 'bg-text-mute',
  uncommon: 'bg-line-2',
  rare: 'bg-rarity-rare',
  epic: 'bg-rarity-epic',
  legendary: 'bg-rarity-legendary',
}

export default function BattleQueue({ selected, onRemove }: BattleQueueProps) {
  const router = useRouter()
  const canStart = selected.length === 5

  function handleStartBattle() {
    // API wiring comes later — navigate to battle for now
    router.push('/battle')
  }

  return (
    <div className="w-72 flex-shrink-0 flex flex-col gap-4">
      {/* Header */}
      <div>
        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">Battle Queue</span>
        <h2 className="font-display font-bold text-h3 text-text mt-0.5">Ready to fight</h2>
      </div>

      {/* Slot indicators */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-chip text-text-mute mr-1">SELECTED</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`w-6 h-6 rounded-badge flex items-center justify-center font-mono font-bold text-[10px] transition-colors ${
              n <= selected.length ? 'bg-lime text-bg' : 'bg-bg-3 border border-line text-text-mute'
            }`}
          >
            {n}
          </span>
        ))}
      </div>

      {/* Selected card list */}
      <div className="flex flex-col gap-2 flex-1">
        {selected.map((card) => {
          const [, repo] = card.repo_name.split('/')
          const hp = card.stars + card.forks + Math.round(card.age_years * 10) + card.contributors
          return (
            <div key={card.id} className="flex items-center gap-2 bg-bg-3 border border-line rounded-panel px-3 py-2">
              <span className={`w-2 h-full min-h-[32px] rounded-full ${RARITY_COLOR[card.rarity] ?? 'bg-text-mute'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-chip font-bold text-text truncate">{repo}</p>
                <p className="font-mono text-[10px] text-text-mute uppercase">
                  {card.rarity} · HP {hp}
                </p>
              </div>
              <button
                onClick={() => onRemove(card.id)}
                className="text-text-mute hover:text-rose transition-colors font-mono text-sm leading-none ml-1"
              >
                ×
              </button>
            </div>
          )
        })}

        {selected.length === 0 && (
          <p className="font-mono text-chip text-text-mute">No cards selected yet.</p>
        )}
      </div>

      {/* League info */}
      <div className="flex items-center justify-between bg-bg-3 border border-line rounded-panel px-3 py-2">
        <span className="font-mono text-chip text-text-mute">YOUR LEAGUE</span>
        <span className="flex items-center gap-1.5 font-mono text-chip text-cyan font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
          Silver
        </span>
      </div>

      {/* Start battle */}
      <button
        onClick={handleStartBattle}
        disabled={!canStart}
        className={`w-full py-4 rounded-cta font-display font-bold text-btn-lg transition-all ${
          canStart
            ? 'bg-lime text-bg hover:brightness-110 shadow-lime-glow cursor-pointer'
            : 'bg-bg-3 border border-line text-text-mute cursor-not-allowed opacity-50'
        }`}
      >
        {canStart ? 'Start Battle →' : `Pick ${5 - selected.length} more card${5 - selected.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
