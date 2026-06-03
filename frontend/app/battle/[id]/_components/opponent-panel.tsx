import Card, { type CardData } from '@/components/card'
import CardBack from './card-back'

interface OpponentPanelProps {
  opponentLabel: string
  card: CardData | null
}

export default function OpponentPanel({ opponentLabel, card }: OpponentPanelProps) {
  return (
    <div className="w-72 shrink-0 flex flex-col items-center justify-start gap-4 p-6 border-r border-line overflow-y-auto">
      <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
        {opponentLabel} Revealed
      </span>
      {card ? <Card card={card} /> : <CardBack />}
    </div>
  )
}
