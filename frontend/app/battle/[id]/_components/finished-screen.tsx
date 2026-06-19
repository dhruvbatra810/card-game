'use client'

import { motion } from 'motion/react'

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
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 font-mono relative overflow-hidden">

      {/* Animated particles for victory */}
      {playerWon && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: '-10px',
                backgroundColor: ['#c6ff3a', '#5be3d0', '#b48cff', '#ffb547', '#ff6b8b'][i % 5],
              }}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{
                y: [0, 400 + Math.random() * 400],
                x: [0, (Math.random() - 0.5) * 200],
                opacity: [1, 1, 0],
                scale: [1, 0.5],
                rotate: [0, Math.random() * 720],
              }}
              transition={{
                duration: 2 + Math.random() * 1.5,
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      <motion.span
        className="text-6xl"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
      >
        {playerWon ? '🏆' : isDraw ? '🤝' : '💀'}
      </motion.span>

      <motion.h1
        className="font-display font-bold text-h2 text-text"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {playerWon ? 'You won!' : isDraw ? "It's a draw!" : `${opponentLabel} wins!`}
      </motion.h1>

      <motion.p
        className="text-text-mute text-lede"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        Final score: <span className="text-lime font-bold">{scorePlayer}</span>
        {' – '}
        <span className="text-rose font-bold">{scoreOpponent}</span>
      </motion.p>

      <motion.div
        className="flex items-center gap-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
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
      </motion.div>

      <motion.button
        onClick={onBack}
        className="px-6 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn hover:brightness-110 transition-all shadow-lime-glow"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        Back to Deck
      </motion.button>
    </div>
  )
}
