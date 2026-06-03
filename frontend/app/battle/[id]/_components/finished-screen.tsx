interface FinishedScreenProps {
  playerWon: boolean
  isDraw: boolean
  scorePlayer: number
  scoreOpponent: number
  earnedXp: number
  earnedCoins: number
  ratingChange?: number
  opponentLabel: string
  onBack: () => void
}

export default function FinishedScreen({
  playerWon,
  isDraw,
  scorePlayer,
  scoreOpponent,
  earnedXp,
  earnedCoins,
  ratingChange,
  opponentLabel,
  onBack,
}: FinishedScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 font-mono">
      <span className="text-6xl">{playerWon ? '🏆' : isDraw ? '🤝' : '💀'}</span>
      <h1 className="font-display font-bold text-h2 text-text">
        {playerWon ? 'You won!' : isDraw ? "It's a draw!" : `${opponentLabel} wins!`}
      </h1>
      <p className="text-text-mute text-lede">
        Final score: <span className="text-lime font-bold">{scorePlayer}</span>
        {' – '}
        <span className="text-rose font-bold">{scoreOpponent}</span>
      </p>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 bg-bg-3 border border-line rounded-ctrl px-4 py-2 text-chip text-text-dim">
          <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
          +{earnedXp} XP
        </span>
        <span className="flex items-center gap-1.5 bg-bg-3 border border-line rounded-ctrl px-4 py-2 text-chip text-text-dim">
          <span className="w-1.5 h-1.5 rounded-full bg-amber inline-block" />
          +{earnedCoins} COINS
        </span>
        {ratingChange !== undefined && (
          <span className={`flex items-center gap-1.5 bg-bg-3 border border-line rounded-ctrl px-4 py-2 text-chip ${ratingChange >= 0 ? 'text-lime' : 'text-rose'}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${ratingChange >= 0 ? 'bg-lime' : 'bg-rose'}`} />
            {ratingChange >= 0 ? '+' : ''}{ratingChange} ELO
          </span>
        )}
      </div>
      <button
        onClick={onBack}
        className="px-6 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn hover:brightness-110 transition-all shadow-lime-glow"
      >
        Back to Deck
      </button>
    </div>
  )
}
