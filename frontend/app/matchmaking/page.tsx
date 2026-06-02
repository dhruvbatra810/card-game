'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL

type Status = 'searching' | 'found' | 'timeout' | 'error'

export default function MatchmakingPage() {
  const router = useRouter()
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<Status>('searching')
  const [elapsed, setElapsed] = useState(0)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setStatus('searching')
    setElapsed(0)
    const ws = new WebSocket(`${WS_BASE}/ws/matchmaking`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      if (!active) return
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      if (msg.type === 'match_found') {
        setStatus('found')
        router.push(`/battle/${msg.battle_id}?pvp=true`)
      }

      if (msg.type === 'timeout') {
        setStatus('timeout')
      }
    }

    ws.onerror = () => {
      if (!active) return
      setStatus('error')
    }

    return () => {
      active = false
      ws.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  // Elapsed timer
  useEffect(() => {
    if (status !== 'searching') return
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [status])

  function handleCancel() {
    wsRef.current?.close()
    router.push('/dashboard')
  }

  function handleRetry() {
    setAttempt(prev => prev + 1)
  }

  if (status === 'timeout') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-6 font-mono">
        <span className="text-5xl">⏱</span>
        <h1 className="font-display font-bold text-h2 text-text">No match found</h1>
        <p className="text-text-mute text-chip">No one in your league is searching right now.</p>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="px-6 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn hover:brightness-110 transition-all shadow-lime-glow"
          >
            Try again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 rounded-cta border border-line text-text-mute font-display font-bold text-btn hover:text-text transition-colors"
          >
            Back to deck
          </button>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-6 font-mono">
        <span className="text-5xl">⚠️</span>
        <h1 className="font-display font-bold text-h2 text-text">Connection error</h1>
        <p className="text-text-mute text-chip">Could not connect to matchmaking. Is the server running?</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn hover:brightness-110 transition-all shadow-lime-glow"
        >
          Back to deck
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-8">
      {/* Pulsing ring animation */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-32 h-32 rounded-full border-2 border-lime opacity-20 animate-ping" />
        <div className="absolute w-24 h-24 rounded-full border-2 border-lime opacity-30 animate-ping" style={{ animationDelay: '0.3s' }} />
        <div className="w-16 h-16 rounded-full bg-bg-3 border-2 border-lime flex items-center justify-center">
          <span className="text-2xl">⚔️</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <h1 className="font-display font-bold text-h2 text-text">Searching for opponent</h1>
        <p className="font-mono text-chip text-text-mute">
          {elapsed < 30
            ? 'Looking in your league...'
            : 'Expanding search to nearby leagues...'}
        </p>
        <p className="font-mono text-chip text-lime tabular-nums">
          {elapsed}s
        </p>
      </div>

      <button
        onClick={handleCancel}
        className="px-6 py-3 rounded-cta border border-line text-text-mute font-display font-bold text-btn hover:text-rose hover:border-rose transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
