import React from 'react'
import { useRouter } from 'next/navigation'

interface BattleShellProps {
  battleId: number
  scorePlayer: number
  scoreOpponent: number
  opponentLabel: string
  roundLabel: string
  roundDots?: React.ReactNode
  leftPanel: React.ReactNode
  centerPanel: React.ReactNode
  rightPanel: React.ReactNode
  onForfeit: () => void
}

export default function BattleShell({
  battleId,
  scorePlayer,
  scoreOpponent,
  opponentLabel,
  roundLabel,
  roundDots,
  leftPanel,
  centerPanel,
  rightPanel,
  onForfeit,
}: BattleShellProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-bg overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-line shrink-0">
        <button
          onClick={onForfeit}
          className="font-mono text-chip text-text-mute hover:text-rose transition-colors"
        >
          ← Forfeit
        </button>

        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          {opponentLabel === 'Bot' ? `Battle #${battleId}` : 'PvP Battle'}
        </span>

        <div className="flex items-center gap-3">
          <span className="font-mono text-chip text-text-mute uppercase">You</span>
          <span className="font-display font-bold text-h3 text-lime">{scorePlayer}</span>
          <span className="font-mono text-text-mute">–</span>
          <span className="font-display font-bold text-h3 text-rose">{scoreOpponent}</span>
          <span className="font-mono text-chip text-text-mute uppercase">{opponentLabel}</span>
        </div>

        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          {roundLabel}
        </span>
      </div>

      {/* Round dots row (bot battle only) */}
      {roundDots && (
        <div className="flex items-center justify-center gap-3 py-2 border-b border-line shrink-0">
          {roundDots}
        </div>
      )}

      {/* Main 3-panel layout */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {leftPanel}
        {centerPanel}
        {rightPanel}
      </div>

    </div>
  )
}
