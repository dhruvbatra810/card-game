'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Card, { type CardData } from '@/components/card'

const API = process.env.NEXT_PUBLIC_API_BASE_URL

const STATS: { key: string; label: string }[] = [
  { key: 'stars',          label: 'STARS' },
  { key: 'forks',         label: 'FORKS' },
  { key: 'age_years',     label: 'AGE' },
  { key: 'contributors',  label: 'CONTRIB' },
  { key: 'activity_score', label: 'ACTIVITY' },
]

type RoundResult = {
  id: number
  round_number: number
  p1_card_id: number
  p2_card_id: number
  stat_chosen: string
  winner_id: number | null
  was_tie: boolean
  was_critical: boolean
  points_awarded: number
}

type BattleState = {
  id: number
  score_player: number
  score_opponent: number
  status: string
  winner_id: number | null
}

type Phase = 'pick-card' | 'pick-stat' | 'submitting' | 'result' | 'bot-picking' | 'finished'

function formatStatValue(key: string, value: number): string {
  if (key === 'age_years') return `${value}y`
  if (key === 'activity_score') {
    if (value >= 70) return 'High'
    if (value >= 30) return 'Mid'
    return 'Low'
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function getRawStat(card: CardData, key: string): number {
  return (card as unknown as Record<string, number>)[key] ?? 0
}

// Face-down card placeholder shown before the bot card is revealed
function CardBack() {
  return (
    <div className="w-48 rounded-card border-2 border-line bg-bg-3 flex flex-col items-center justify-center h-72 text-text-mute font-mono text-chip">
      <span className="text-3xl mb-2">?</span>
      <span className="uppercase tracking-widest text-[10px]">Hidden</span>
    </div>
  )
}

export default function BattlePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const battleId = Number(params.id)
  const cardIdsParam = searchParams.get('cards') ?? ''
  const selectedIds = cardIdsParam.split(',').map(Number).filter(Boolean)

  const [myCards, setMyCards] = useState<CardData[]>([])
  const [usedCardIds, setUsedCardIds] = useState<number[]>([])
  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [rounds, setRounds] = useState<RoundResult[]>([])
  const [botCard, setBotCard] = useState<CardData | null>(null)
  const [phase, setPhase] = useState<Phase>('pick-card')
  const [isPicker, setIsPicker] = useState(true)

  // refs so the finish check always reads current scores regardless of stale closures
  const playerScoreRef = useRef(0)
  const opponentScoreRef = useRef(0)

  // Load player's cards and initial battle state on mount
  useEffect(() => {
    async function load() {
      const [cardsRes, battleRes] = await Promise.all([
        fetch(`${API}/cards`, { credentials: 'include' }),
        fetch(`${API}/battles/${battleId}`, { credentials: 'include' }),
      ])
      const allCards: CardData[] = await cardsRes.json()
      const battleData: BattleState = await battleRes.json()

      const filtered = allCards.filter((c) => selectedIds.includes(c.id))
      setMyCards(filtered)
      setBattle(battleData)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitRound = useCallback(async (statKey: string) => {
    if (!activeCard) return
    setPhase('submitting')

    const res = await fetch(`${API}/battles/${battleId}/round`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p1_card_id: activeCard.id, stat_chosen: statKey }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('Round failed:', err)
      setPhase('pick-stat')
      return
    }
    const round: RoundResult = await res.json()

    // Fetch the bot's card to display it
    const botCardRes = await fetch(`${API}/cards/${round.p2_card_id}/public`, { credentials: 'include' })
    const botCardData: CardData = await botCardRes.json()

    // Update scores via refs (always current, no stale closure issue)
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
      setPhase('finished')
      return
    }

    setPhase('result')
  }, [activeCard, battleId])

  // When bot is picker, auto-pick a random stat after a delay
  useEffect(() => {
    if (phase !== 'bot-picking' || !activeCard) return

    const timer = setTimeout(() => {
      const randomStat = STATS[Math.floor(Math.random() * STATS.length)]
      submitRound(randomStat.key)
    }, 1500)

    return () => clearTimeout(timer)
  }, [phase, activeCard, submitRound])

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
    // Determine picker for next round
    if (round.was_tie) {
      // Same picker
    } else if (round.winner_id !== null) {
      // Player won → bot picks next
      setIsPicker(false)
    } else {
      // Bot won → player picks next
      setIsPicker(true)
    }

    setActiveCard(null)
    setBotCard(null)
    setPhase('pick-card')
  }

  const availableCards = myCards.filter((c) => !usedCardIds.includes(c.id))

  if (!battle || myCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen font-mono text-text-mute">
        Loading battle...
      </div>
    )
  }

  // ── Finished screen ─────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const playerWon = battle.score_player > battle.score_opponent
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 font-mono">
        <span className="text-6xl">{playerWon ? '🏆' : '💀'}</span>
        <h1 className="font-display font-bold text-h2 text-text">
          {playerWon ? 'You won!' : 'Bot wins!'}
        </h1>
        <p className="text-text-mute text-lede">
          Final score: <span className="text-lime font-bold">{battle.score_player}</span>
          {' – '}
          <span className="text-rose font-bold">{battle.score_opponent}</span>
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn hover:brightness-110 transition-all shadow-lime-glow"
        >
          Back to Deck
        </button>
      </div>
    )
  }

  const lastRound = rounds[rounds.length - 1] ?? null

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-bg overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-line shrink-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="font-mono text-chip text-text-mute hover:text-rose transition-colors"
        >
          ← Forfeit
        </button>

        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          Battle #{battleId}
        </span>

        {/* Score */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-chip text-text-mute uppercase">You</span>
          <span className="font-display font-bold text-h3 text-lime">{battle.score_player}</span>
          <span className="font-mono text-text-mute">–</span>
          <span className="font-display font-bold text-h3 text-rose">{battle.score_opponent}</span>
          <span className="font-mono text-chip text-text-mute uppercase">Bot</span>
        </div>

        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          Round {rounds.length + (phase === 'result' ? 0 : 1)} of 5
        </span>
      </div>

      {/* ── Round tracker dots ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 py-2 border-b border-line shrink-0">
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
      </div>

      {/* ── Main 3-panel layout ──────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-0 overflow-hidden">

        {/* Left — Opponent card */}
        <div className="w-72 shrink-0 flex flex-col items-center justify-start gap-4 p-6 border-r border-line overflow-y-auto">
          <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
            Opponent Revealed
          </span>
          {botCard ? (
            <Card card={botCard} />
          ) : (
            <CardBack />
          )}
        </div>

        {/* Center — Stat picker / result */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">

          {/* Picker label */}
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

          {/* Result summary */}
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
              <button
                onClick={() => handleNextRound(lastRound)}
                className="px-6 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn hover:brightness-110 transition-all shadow-lime-glow mt-2"
              >
                Next Round →
              </button>
            </div>
          )}
        </div>

        {/* Right — Player's active card + hand */}
        <div className="w-72 shrink-0 flex flex-col gap-4 p-6 border-l border-line overflow-y-auto">
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

          <span className="font-mono text-chip text-text-mute uppercase tracking-widest mt-2">
            Remaining in Hand
          </span>

          <div className="flex flex-col gap-2">
            {availableCards.map((card) => {
              const isActive = activeCard?.id === card.id
              const parts = card.repo_name?.split('/') ?? []
              const repo = parts[1] ?? parts[0] ?? 'unknown'
              const hp = card.stars + card.forks + Math.round(card.age_years * 10) + card.contributors

              return (
                <button
                  key={card.id}
                  onClick={() => phase === 'pick-card' && handleCardPick(card)}
                  disabled={phase !== 'pick-card'}
                  className={`flex items-center gap-2 rounded-panel border px-3 py-2 text-left transition-all font-mono ${
                    isActive
                      ? 'border-lime bg-bg-3'
                      : phase === 'pick-card'
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

            {/* Used cards shown as greyed out */}
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
    </div>
  )
}
