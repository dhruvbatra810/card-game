'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Card, { type CardData } from '@/components/card'
import BattleShell from './_components/battle-shell'
import OpponentPanel from './_components/opponent-panel'
import PlayerHand from './_components/player-hand'
import FinishedScreen from './_components/finished-screen'
import {
  STATS,
  type RoundResult,
  type BattleState,
  type BotPhase,
  formatStatValue,
  getRawStat,
} from './_components/types'

const API = process.env.NEXT_PUBLIC_API_BASE_URL

interface BotBattleProps {
  battleId: number
  selectedIds: number[]
}

export default function BotBattle({ battleId, selectedIds }: BotBattleProps) {
  const router = useRouter()

  const [myCards, setMyCards] = useState<CardData[]>([])
  const [usedCardIds, setUsedCardIds] = useState<number[]>([])
  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [rounds, setRounds] = useState<RoundResult[]>([])
  const [botCard, setBotCard] = useState<CardData | null>(null)
  const [phase, setPhase] = useState<BotPhase>('pick-card')
  const [isPicker, setIsPicker] = useState(true)
  const [earnedXp, setEarnedXp] = useState(0)
  const [earnedCoins, setEarnedCoins] = useState(0)

  const playerScoreRef = useRef(0)
  const opponentScoreRef = useRef(0)

  // Load cards and battle data, filtering to the selected deck
  useEffect(() => {
    async function load() {
      try {
        const [cardsRes, battleRes] = await Promise.all([
          fetch(`${API}/cards`, { credentials: 'include' }),
          fetch(`${API}/battles/${battleId}`, { credentials: 'include' }),
        ])
        if (!cardsRes.ok || !battleRes.ok) return
        const allCards: CardData[] = await cardsRes.json()
        const battleData: BattleState = await battleRes.json()
        const filtered = allCards.filter((c) => selectedIds.includes(c.id))
        setMyCards(filtered)
        setBattle(battleData)
      } catch (err) {
        console.error('Failed to load battle data:', err)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitRound = useCallback(async (statKey: string) => {
    if (!activeCard) return
    setPhase('submitting')

    try {
      const res = await fetch(`${API}/battles/${battleId}/round`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p1_card_id: activeCard.id, stat_chosen: statKey }),
      })
      if (!res.ok) {
        setPhase(isPicker ? 'pick-stat' : 'bot-picking')
        return
      }
      const round: RoundResult = await res.json()

      const botCardRes = await fetch(`${API}/cards/${round.p2_card_id}/public`, { credentials: 'include' })
      if (!botCardRes.ok) {
        setPhase(isPicker ? 'pick-stat' : 'bot-picking')
        return
      }
      const botCardData: CardData = await botCardRes.json()

      const playerWon = !round.was_tie && round.winner_id !== null
      const botWon = !round.was_tie && round.winner_id === null

      if (playerWon) playerScoreRef.current += round.points_awarded
      if (botWon) opponentScoreRef.current += round.points_awarded

      setBattle((prev) => {
        if (!prev) return prev
        return { ...prev, score_player: playerScoreRef.current, score_opponent: opponentScoreRef.current }
      })

      setRounds((prev) => [...prev, round])
      setBotCard(botCardData)

      if (playerScoreRef.current >= 3 || opponentScoreRef.current >= 3 || round.round_number >= 5) {
        setEarnedXp(round.xp)
        setEarnedCoins(round.coins)
        setPhase('finished')
        return
      }

      setPhase('result')
    } catch (err) {
      console.error('submitRound error:', err)
      setPhase(isPicker ? 'pick-stat' : 'bot-picking')
    }
  }, [activeCard, battleId, isPicker])

  // Bot auto-picks stat after a short delay
  useEffect(() => {
    if (phase !== 'bot-picking' || !activeCard) return
    const timer = setTimeout(() => {
      const randomStat = STATS[Math.floor(Math.random() * STATS.length)]
      submitRound(randomStat.key)
    }, 1500)
    return () => clearTimeout(timer)
  }, [phase, activeCard, submitRound])

  // Auto-advance to next round 2s after result
  useEffect(() => {
    if (phase !== 'result') return
    const last = rounds[rounds.length - 1]
    if (!last) return
    const timer = setTimeout(() => handleNextRound(last), 2000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function handleCardPick(card: CardData) {
    setActiveCard(card)
    setUsedCardIds((prev) => [...prev, card.id])
    setBotCard(null)
    if (isPicker) {
      setPhase('pick-stat')
    } else {
      setPhase('bot-picking')
    }
  }

  function handleStatPick(statKey: string) {
    submitRound(statKey)
  }

  function handleNextRound(round: RoundResult) {
    if (round.was_tie) {
      // same picker — do nothing
    } else if (round.winner_id !== null) {
      setIsPicker(false)
    } else {
      setIsPicker(true)
    }
    setActiveCard(null)
    setBotCard(null)
    setPhase('pick-card')
  }

  if (!battle || myCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen font-mono text-text-mute">
        Loading battle...
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <FinishedScreen
        playerWon={battle.score_player > battle.score_opponent}
        isDraw={battle.score_player === battle.score_opponent}
        scorePlayer={battle.score_player}
        scoreOpponent={battle.score_opponent}
        earnedXp={earnedXp}
        earnedCoins={earnedCoins}
        opponentLabel="Bot"
        onBack={() => router.push('/dashboard')}
      />
    )
  }

  const lastRound = rounds[rounds.length - 1] ?? null
  const roundNum = rounds.length + (phase === 'result' ? 0 : 1)

  const roundDots = (
    <>
      {[1, 2, 3, 4, 5].map((n) => {
        const r = rounds[n - 1]
        let color = 'bg-line-2'
        if (r) {
          if (r.was_tie) color = 'bg-amber'
          else if (r.winner_id !== null) color = 'bg-lime'
          else color = 'bg-rose'
        }
        return (
          <div key={n} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${color} transition-colors`} />
            <span className="font-mono text-[10px] text-text-mute">R{n}</span>
          </div>
        )
      })}
    </>
  )

  const centerPanel = (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">

      {/* Phase label */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-lime" />
        <span className="font-mono text-chip text-lime uppercase tracking-widest">
          {phase === 'bot-picking' ? 'Bot is picking...' : "You're the picker"}
        </span>
      </div>

      {phase === 'pick-card' && (
        <p className="font-mono text-text-mute text-sm">
          Pick a card from your hand on the right.
        </p>
      )}

      {/* Stat picker */}
      {(phase === 'pick-stat' || phase === 'bot-picking' || phase === 'submitting' || phase === 'result') && activeCard && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          <p className="font-mono text-chip text-text-mute text-center mb-2">
            {phase === 'pick-stat' ? 'Choose a stat — higher number wins' : ''}
            {phase === 'bot-picking' ? 'Bot is choosing a stat...' : ''}
            {phase === 'submitting' ? 'Resolving round...' : ''}
            {phase === 'result' ? 'Round result' : ''}
          </p>

          {STATS.map((stat) => {
            const myVal = getRawStat(activeCard, stat.key)
            const botVal = botCard ? getRawStat(botCard, stat.key) : null
            const isChosen = lastRound?.stat_chosen === stat.key && phase === 'result'
            const playerWonStat = isChosen && lastRound?.winner_id !== null
            const botWonStat = isChosen && lastRound?.winner_id === null && !lastRound?.was_tie
            const isTie = isChosen && lastRound?.was_tie

            let rowStyle = 'bg-bg-3 border border-line'
            if (isChosen) {
              if (playerWonStat) rowStyle = 'bg-bg-3 border-2 border-lime'
              else if (botWonStat) rowStyle = 'bg-bg-3 border-2 border-rose'
              else if (isTie) rowStyle = 'bg-bg-3 border-2 border-amber'
            }

            return (
              <button
                key={stat.key}
                disabled={phase !== 'pick-stat'}
                onClick={() => handleStatPick(stat.key)}
                className={`flex items-center justify-between px-4 py-3 rounded-panel transition-all font-mono ${rowStyle} ${
                  phase === 'pick-stat' ? 'hover:border-lime cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="text-chip text-text-mute uppercase tracking-wide">{stat.label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-chip text-text font-bold">{formatStatValue(stat.key, myVal)}</span>
                  <span className="text-chip text-text-mute">vs</span>
                  <span className="text-chip text-text-mute">
                    {botVal !== null ? formatStatValue(stat.key, botVal) : '?'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Round result message */}
      {phase === 'result' && lastRound && (
        <div className="flex flex-col items-center gap-3 mt-2">
          {lastRound.was_tie && (
            <p className="font-mono text-chip text-amber uppercase tracking-widest">Tie — same picker next round</p>
          )}
          {lastRound.was_critical && (
            <p className="font-mono text-chip text-lime uppercase tracking-widest">⚡ Critical hit! +2 points</p>
          )}
          {!lastRound.was_tie && lastRound.winner_id !== null && (
            <p className="font-mono text-chip text-lime uppercase tracking-widest">You win this round!</p>
          )}
          {!lastRound.was_tie && lastRound.winner_id === null && (
            <p className="font-mono text-chip text-rose uppercase tracking-widest">Bot wins this round</p>
          )}
          <p className="font-mono text-[10px] text-text-mute uppercase tracking-widest mt-1">Next round starting...</p>
        </div>
      )}

    </div>
  )

  return (
    <BattleShell
      battleId={battleId}
      scorePlayer={battle.score_player}
      scoreOpponent={battle.score_opponent}
      opponentLabel="Bot"
      roundLabel={`Round ${roundNum} of 5`}
      roundDots={roundDots}
      leftPanel={<OpponentPanel opponentLabel="Bot" card={botCard} />}
      centerPanel={centerPanel}
      rightPanel={
        <PlayerHand
          myCards={myCards}
          usedCardIds={usedCardIds}
          activeCard={activeCard}
          canPick={phase === 'pick-card'}
          onCardPick={handleCardPick}
        />
      }
      onForfeit={() => router.push('/dashboard')}
    />
  )
}
