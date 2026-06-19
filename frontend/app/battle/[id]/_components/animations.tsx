'use client'

import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'

// ─── Card Flip Wrapper ───────────────────────────────────────────────────────
// Wraps any card component and plays a 3D flip when the card changes from null
// to a real card (the "reveal" moment).

interface CardFlipProps {
  revealed: boolean
  front: React.ReactNode
  back: React.ReactNode
}

export function CardFlip({ revealed, front, back }: CardFlipProps) {
  return (
    <div className="relative w-48 h-72" style={{ perspective: '800px' }}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: revealed ? 0 : 180 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Front face — the revealed card */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {front}
        </div>

        {/* Back face — the "?" placeholder */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Score Pop ───────────────────────────────────────────────────────────────
// Animates the score number with a scale bounce + color flash when it changes.

interface ScorePopProps {
  value: number
  color: 'lime' | 'rose'
}

export function ScorePop({ value, color }: ScorePopProps) {
  const [prevValue, setPrevValue] = useState(value)
  const [popping, setPopping] = useState(false)

  useEffect(() => {
    if (value !== prevValue) {
      setPopping(true)
      setPrevValue(value)
      const timer = setTimeout(() => setPopping(false), 400)
      return () => clearTimeout(timer)
    }
  }, [value, prevValue])

  const colorClass = color === 'lime' ? 'text-lime' : 'text-rose'

  return (
    <motion.span
      className={`font-display font-bold text-h3 ${colorClass} inline-block`}
      animate={
        popping
          ? { scale: [1, 1.4, 1], textShadow: [`0 0 0px currentColor`, `0 0 12px currentColor`, `0 0 0px currentColor`] }
          : { scale: 1 }
      }
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {value}
    </motion.span>
  )
}

// ─── Round Result Banner ─────────────────────────────────────────────────────
// Slides in from the top with the round outcome, optionally shakes on critical.

type BannerVariant = 'win' | 'lose' | 'tie' | 'critical'

interface RoundBannerProps {
  variant: BannerVariant
  message: string
  subMessage?: string
  visible: boolean
}

export function RoundBanner({ variant, message, subMessage, visible }: RoundBannerProps) {
  const colorMap: Record<BannerVariant, string> = {
    win: 'border-lime text-lime',
    lose: 'border-rose text-rose',
    tie: 'border-amber text-amber',
    critical: 'border-lime text-lime',
  }

  const bgMap: Record<BannerVariant, string> = {
    win: 'bg-lime/5',
    lose: 'bg-rose/5',
    tie: 'bg-amber/5',
    critical: 'bg-lime/10',
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.9 }}
          animate={
            variant === 'critical'
              ? {
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  x: [0, -4, 4, -3, 3, -1, 1, 0],
                }
              : { y: 0, opacity: 1, scale: 1 }
          }
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`flex flex-col items-center gap-1 px-6 py-3 rounded-panel border-2 ${colorMap[variant]} ${bgMap[variant]}`}
        >
          <span className="font-display font-bold text-h3 uppercase tracking-wide">
            {message}
          </span>
          {subMessage && (
            <span className="font-mono text-chip text-text-mute">
              {subMessage}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
