'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Card, { type CardData } from '@/components/card'

const API = process.env.NEXT_PUBLIC_API_BASE_URL
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL

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
  xp: number
  coins: number
}

// Round result from PvP WebSocket — already adapted to this player's perspective
type PvpRoundResult = {
  winner_id: number | null
  i_won: boolean
  score_me: number
  score_opp: number
  my_card_id: number
  opp_card_id: number
  stat_chosen: string
  was_tie: boolean
  was_critical: boolean
  type_advantage: boolean
  points_awarded: number
  i_pick_next: boolean
}

type BattleState = {
  id: number
  score_player: number
  score_opponent: number
  status: string
  winner_id: number | null
}

type Phase =
  | 'pick-card'
  | 'pick-stat'
  | 'submitting'
  | 'result'
  | 'bot-picking'
  | 'waiting-for-opponent'
  | 'pvp-result'
  | 'opponent-left'
  | 'finished'

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
  const isPvp = searchParams.get('pvp') === 'true'

  const [myCards, setMyCards] = useState<CardData[]>([])
  const [usedCardIds, setUsedCardIds] = useState<number[]>([])
  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [rounds, setRounds] = useState<RoundResult[]>([])
  const [botCard, setBotCard] = useState<CardData | null>(null)
  const [phase, setPhase] = useState<Phase>('pick-card')
  const [isPicker, setIsPicker] = useState(true)
  const [earnedXp, setEarnedXp] = useState(0)
  const [earnedCoins, setEarnedCoins] = useState(0)

  // PvP-specific state
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

  const playerScoreRef = useRef(0)
  const opponentScoreRef = useRef(0)

  // ── Load cards + battle state ──────────────────────────────────────────────
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
        const filtered = isPvp ? allCards : allCards.filter((c) => selectedIds.includes(c.id))
        setMyCards(filtered)
        setBattle(battleData)
      } catch (err) {
        console.error('Failed to load battle data:', err)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── PvP: connect WebSocket after battle loads ──────────────────────────────
  useEffect(() => {
    if (!isPvp) return
    let active = true
    let battleStarted = false

    const ws = new WebSocket(`${WS_BASE}/ws/battle/${battleId}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      if (!active) return
      const msg = JSON.parse(event.data)

      if (msg.type === 'battle_start') {
        // Guard against duplicate battle_start (e.g. React Strict Mode reconnect)
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
        setPvpRoundCount(prev => prev + 1)

        fetch(`${API}/cards/${r.opp_card_id}/public`, { credentials: 'include' })
          .then((res) => res.json())
          .then((card: CardData) => setBotCard(card))
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
        setBattle((prev) => prev
          ? { ...prev, score_player: msg.score_me, score_opponent: msg.score_opp, winner_id: playerWon ? -1 : null }
          : prev
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
  }, [isPvp, battleId])

  // ── Bot battle: submit round via HTTP ──────────────────────────────────────
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
      setPhase('pick-stat')
      return
    }
    const round: RoundResult = await res.json()

    const botCardRes = await fetch(`${API}/cards/${round.p2_card_id}/public`, { credentials: 'include' })
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
  }, [activeCard, battleId])

  // Bot auto-picks stat when it's the bot's turn
  useEffect(() => {
    if (phase !== 'bot-picking' || !activeCard) return
    const timer = setTimeout(() => {
      const randomStat = STATS[Math.floor(Math.random() * STATS.length)]
      submitRound(randomStat.key)
    }, 1500)
    return () => clearTimeout(timer)
  }, [phase, activeCard, submitRound])

  // Auto-advance to next round 2s after result is shown
  useEffect(() => {
    if (phase === 'result') {
      const last = rounds[rounds.length - 1]
      if (!last) return
      const timer = setTimeout(() => handleNextRound(last), 2000)
      return () => clearTimeout(timer)
    }
    if (phase === 'pvp-result') {
      const timer = setTimeout(() => handlePvpNextRound(), 2000)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PvP: submit move via WebSocket ─────────────────────────────────────────
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

  // ── Card / stat pick handlers ──────────────────────────────────────────────
  function handleCardPick(card: CardData) {
    setActiveCard(card)
    setUsedCardIds((prev) => [...prev, card.id])
    setBotCard(null)

    if (isPvp) {
      if (amIPicker) {
        setPhase('pick-stat')
      } else {
        submitPvpMove('stars', card)
      }
      return
    }

    if (isPicker) {
      setPhase('pick-stat')
    } else {
      setPhase('bot-picking')
    }
  }

  function handleStatPick(statKey: string) {
    if (isPvp) {
      submitPvpMove(statKey)
    } else {
      submitRound(statKey)
    }
  }

  function handleNextRound(round: RoundResult) {
    if (round.was_tie) {
      // same picker
    } else if (round.winner_id !== null) {
      setIsPicker(false)
    } else {
      setIsPicker(true)
    }
    setActiveCard(null)
    setBotCard(null)
    setPhase('pick-card')
  }

  function handlePvpNextRound() {
    setActiveCard(null)
    setBotCard(null)
    setPvpLastRound(null)
    setOppSubmitted(false)
    setPhase('pick-card')
  }

  const availableCards = myCards.filter((c) => !usedCardIds.includes(c.id))

  if (!battle || myCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen font-mono text-text-mute">
        {isPvp ? 'Connecting to battle...' : 'Loading battle...'}
      </div>
    )
  }

  // ── Finished screen ────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const playerWon = isPvp
      ? pvpScoreMe > pvpScoreOpp
      : battle.score_player > battle.score_opponent
    const isDraw = isPvp
      ? pvpScoreMe === pvpScoreOpp
      : battle.score_player === battle.score_opponent
    const scoreLeft = isPvp ? pvpScoreMe : battle.score_player
    const scoreRight = isPvp ? pvpScoreOpp : battle.score_opponent

    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 font-mono">
        <span className="text-6xl">{playerWon ? '🏆' : isDraw ? '🤝' : '💀'}</span>
        <h1 className="font-display font-bold text-h2 text-text">
          {playerWon ? 'You won!' : isDraw ? "It's a draw!" : isPvp ? 'You lost!' : 'Bot wins!'}
        </h1>
        <p className="text-text-mute text-lede">
          Final score: <span className="text-lime font-bold">{scoreLeft}</span>
          {' – '}
          <span className="text-rose font-bold">{scoreRight}</span>
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
          {isPvp && (
            <span className={`flex items-center gap-1.5 bg-bg-3 border border-line rounded-ctrl px-4 py-2 text-chip ${pvpRatingChange >= 0 ? 'text-lime' : 'text-rose'}`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${pvpRatingChange >= 0 ? 'bg-lime' : 'bg-rose'}`} />
              {pvpRatingChange >= 0 ? '+' : ''}{pvpRatingChange} ELO
            </span>
          )}
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn hover:brightness-110 transition-all shadow-lime-glow"
        >
          Back to Deck
        </button>
      </div>
    )
  }

  // ── Opponent disconnected screen ───────────────────────────────────────────
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

  const lastRound = rounds[rounds.length - 1] ?? null
  const scorePlayer = isPvp ? pvpScoreMe : battle.score_player
  const scoreOpponent = isPvp ? pvpScoreOpp : battle.score_opponent
  const opponentLabel = isPvp ? 'Opponent' : 'Bot'

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
          {isPvp ? 'PvP Battle' : `Battle #${battleId}`}
        </span>

        <div className="flex items-center gap-3">
          <span className="font-mono text-chip text-text-mute uppercase">You</span>
          <span className="font-display font-bold text-h3 text-lime">{scorePlayer}</span>
          <span className="font-mono text-text-mute">–</span>
          <span className="font-display font-bold text-h3 text-rose">{scoreOpponent}</span>
          <span className="font-mono text-chip text-text-mute uppercase">{opponentLabel}</span>
        </div>

        <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
          Round {(isPvp ? pvpRoundCount : rounds.length) + (phase === 'result' || phase === 'pvp-result' ? 0 : 1)} of 5
        </span>
      </div>

      {/* ── Round tracker dots ──────────────────────────────────────────────── */}
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

      {/* ── Main 3-panel layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-0 overflow-hidden">

        {/* Left — Opponent card */}
        <div className="w-72 shrink-0 flex flex-col items-center justify-start gap-4 p-6 border-r border-line overflow-y-auto">
          <span className="font-mono text-chip text-text-mute uppercase tracking-widest">
            {opponentLabel} Revealed
          </span>
          {botCard ? <Card card={botCard} /> : <CardBack />}
        </div>

        {/* Center — Stat picker / result */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">

          {/* Phase label */}
          {isPvp && pvpRole && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime" />
              <span className="font-mono text-chip text-lime uppercase tracking-widest">
                {amIPicker ? "You pick the stat" : "Opponent picks the stat"}
              </span>
            </div>
          )}

          {!isPvp && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime" />
              <span className="font-mono text-chip text-lime uppercase tracking-widest">
                {phase === 'bot-picking' ? 'Bot is picking...' : "You're the picker"}
              </span>
            </div>
          )}

          {phase === 'pick-card' && (
            <p className="font-mono text-text-mute text-sm">
              Pick a card from your hand on the right.
            </p>
          )}

          {/* Waiting for opponent (PvP only) */}
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

          {/* Bot battle stat picker */}
          {!isPvp && (phase === 'pick-stat' || phase === 'bot-picking' || phase === 'submitting' || phase === 'result') && activeCard && (
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

          {/* PvP stat picker (current picker only) */}
          {isPvp && phase === 'pick-stat' && activeCard && amIPicker && (
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

          {/* Bot battle result */}
          {!isPvp && phase === 'result' && lastRound && (
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

        {/* Right — Player's active card + hand */}
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
    </div>
  )
}
