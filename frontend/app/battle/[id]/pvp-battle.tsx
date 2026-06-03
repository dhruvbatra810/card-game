'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { type CardData } from '@/components/card'
import BattleShell from './_components/battle-shell'
import OpponentPanel from './_components/opponent-panel'
import PlayerHand from './_components/player-hand'
import FinishedScreen from './_components/finished-screen'
import {
  STATS,
  type PvpRoundResult,
  type BattleState,
  type PvpPhase,
  formatStatValue,
  getRawStat,
} from './_components/types'

const API = process.env.NEXT_PUBLIC_API_BASE_URL
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL

interface PvpBattleProps {
  battleId: number
}

export default function PvpBattle({ battleId }: PvpBattleProps) {
  const router = useRouter()

  const [myCards, setMyCards] = useState<CardData[]>([])
  const [usedCardIds, setUsedCardIds] = useState<number[]>([])
  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [oppCard, setOppCard] = useState<CardData | null>(null)
  const [phase, setPhase] = useState<PvpPhase>('pick-card')
  const [earnedXp, setEarnedXp] = useState(0)
  const [earnedCoins, setEarnedCoins] = useState(0)

  const [pvpRole, setPvpRole] = useState<'player1' | 'player2' | null>(null)
  const [amIPicker, setAmIPicker] = useState(false)
  const [pvpLastRound, setPvpLastRound] = useState<PvpRoundResult | null>(null)
  const [pvpRatingChange, setPvpRatingChange] = useState(0)
  const [pvpScoreMe, setPvpScoreMe] = useState(0)
  const [pvpScoreOpp, setPvpScoreOpp] = useState(0)
  const [oppSubmitted, setOppSubmitted] = useState(false)
  const [pvpRoundCount, setPvpRoundCount] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const myUserIdRef = useRef<number | null>(null)

  // Load all player cards and battle metadata
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
        setMyCards(allCards)
        setBattle(battleData)
      } catch (err) {
        console.error('Failed to load battle data:', err)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Connect to PvP WebSocket
  useEffect(() => {
    let active = true
    let battleStarted = false

    const ws = new WebSocket(`${WS_BASE}/ws/battle/${battleId}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      if (!active) return
      const msg = JSON.parse(event.data)

      if (msg.type === 'battle_start') {
        if (!battleStarted) {
          battleStarted = true
          setPvpRole(msg.your_role)
          const myId = msg.your_role === 'player1' ? msg.player1_id : msg.player2_id
          myUserIdRef.current = myId
          setAmIPicker(msg.picker_id === myId)
          setPhase('pick-card')
        }
        return
      }

      if (msg.type === 'opponent_submitted') {
        setOppSubmitted(true)
      }

      if (msg.type === 'round_result') {
        const r: PvpRoundResult = msg
        setPvpLastRound(r)
        setPvpScoreMe(r.score_me)
        setPvpScoreOpp(r.score_opp)
        setOppSubmitted(false)
        setAmIPicker(r.i_pick_next)
        setPvpRoundCount((prev) => prev + 1)

        fetch(`${API}/cards/${r.opp_card_id}/public`, { credentials: 'include' })
          .then((res) => res.json())
          .then((card: CardData) => setOppCard(card))
          .catch(() => {})

        setPhase('pvp-result')
      }

      if (msg.type === 'battle_end') {
        setEarnedXp(msg.xp)
        setEarnedCoins(msg.coins)
        setPvpRatingChange(msg.rating_change)
        setPvpScoreMe(msg.score_me)
        setPvpScoreOpp(msg.score_opp)
        const playerWon = msg.i_won
        setBattle((prev) =>
          prev ? { ...prev, score_player: msg.score_me, score_opponent: msg.score_opp, winner_id: playerWon ? -1 : null } : prev
        )
        setPhase('finished')
      }

      if (msg.type === 'opponent_disconnected') {
        setPhase('opponent-left')
      }
    }

    ws.onerror = (e) => {
      if (!active) return
      console.error('PvP WS error', e)
    }

    return () => {
      active = false
      ws.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId])

  // Auto-advance to next round 2s after pvp-result
  useEffect(() => {
    if (phase !== 'pvp-result') return
    const timer = setTimeout(() => handlePvpNextRound(), 2000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function submitPvpMove(statKey: string, cardOverride?: CardData) {
    const cardToUse = cardOverride ?? activeCard
    if (!cardToUse || !wsRef.current) return
    wsRef.current.send(JSON.stringify({
      type: 'submit',
      card_id: cardToUse.id,
      stat: statKey,
    }))
    setPhase('waiting-for-opponent')
  }

  function handleCardPick(card: CardData) {
    setActiveCard(card)
    setUsedCardIds((prev) => [...prev, card.id])
    setOppCard(null)
    if (amIPicker) {
      setPhase('pick-stat')
    } else {
      submitPvpMove('stars', card)
    }
  }

  function handleStatPick(statKey: string) {
    submitPvpMove(statKey)
  }

  function handlePvpNextRound() {
    setActiveCard(null)
    setOppCard(null)
    setPvpLastRound(null)
    setOppSubmitted(false)
    setPhase('pick-card')
  }

  if (!battle || myCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen font-mono text-text-mute">
        Connecting to battle...
      </div>
    )
  }

  if (phase === 'opponent-left') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 font-mono">
        <span className="text-6xl">🏃</span>
        <h1 className="font-display font-bold text-h2 text-text">Opponent left</h1>
        <p className="text-text-mute text-chip">Your opponent disconnected. You win by forfeit!</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn hover:brightness-110 transition-all shadow-lime-glow"
        >
          Back to Deck
        </button>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <FinishedScreen
        playerWon={pvpScoreMe > pvpScoreOpp}
        isDraw={pvpScoreMe === pvpScoreOpp}
        scorePlayer={pvpScoreMe}
        scoreOpponent={pvpScoreOpp}
        earnedXp={earnedXp}
        earnedCoins={earnedCoins}
        ratingChange={pvpRatingChange}
        opponentLabel="opponent"
        onBack={() => router.push('/dashboard')}
      />
    )
  }

  const roundLabel = `Round ${pvpRoundCount + (phase === 'pvp-result' ? 0 : 1)} of 5`

  const centerPanel = (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">

      {/* Phase label */}
      {pvpRole && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime" />
          <span className="font-mono text-chip text-lime uppercase tracking-widest">
            {amIPicker ? 'You pick the stat' : 'Opponent picks the stat'}
          </span>
        </div>
      )}

      {phase === 'pick-card' && (
        <p className="font-mono text-text-mute text-sm">
          Pick a card from your hand on the right.
        </p>
      )}

      {/* Waiting for opponent */}
      {phase === 'waiting-for-opponent' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-chip text-text-mute">
            {oppSubmitted ? 'Opponent submitted — resolving...' : 'Waiting for opponent to pick...'}
          </p>
        </div>
      )}

      {/* PvP round result */}
      {phase === 'pvp-result' && pvpLastRound && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            {pvpLastRound.was_tie && (
              <p className="font-mono text-chip text-amber uppercase tracking-widest">Tie!</p>
            )}
            {pvpLastRound.was_critical && (
              <p className="font-mono text-chip text-lime uppercase tracking-widest">⚡ Critical hit! +2 points</p>
            )}
            {!pvpLastRound.was_tie && pvpLastRound.i_won && (
              <p className="font-mono text-chip text-lime uppercase tracking-widest">You win this round!</p>
            )}
            {!pvpLastRound.was_tie && !pvpLastRound.i_won && (
              <p className="font-mono text-chip text-rose uppercase tracking-widest">Opponent wins this round</p>
            )}
            <p className="font-mono text-chip text-text-mute">
              Stat: {pvpLastRound.stat_chosen.toUpperCase()}
            </p>
          </div>
          <p className="font-mono text-[10px] text-text-mute uppercase tracking-widest mt-1">Next round starting...</p>
        </div>
      )}

      {/* PvP stat picker (current picker only) */}
      {phase === 'pick-stat' && activeCard && amIPicker && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          <p className="font-mono text-chip text-text-mute text-center mb-2">
            Choose a stat — higher number wins
          </p>
          {STATS.map((stat) => {
            const myVal = getRawStat(activeCard, stat.key)
            return (
              <button
                key={stat.key}
                onClick={() => handleStatPick(stat.key)}
                className="flex items-center justify-between px-4 py-3 rounded-panel transition-all font-mono bg-bg-3 border border-line hover:border-lime cursor-pointer"
              >
                <span className="text-chip text-text-mute uppercase tracking-wide">{stat.label}</span>
                <span className="text-chip text-text font-bold">{formatStatValue(stat.key, myVal)}</span>
              </button>
            )
          })}
        </div>
      )}

    </div>
  )

  return (
    <BattleShell
      battleId={battleId}
      scorePlayer={pvpScoreMe}
      scoreOpponent={pvpScoreOpp}
      opponentLabel="Opponent"
      roundLabel={roundLabel}
      leftPanel={<OpponentPanel opponentLabel="Opponent" card={oppCard} />}
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
