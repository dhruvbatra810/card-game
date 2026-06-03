'use client'

import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import BotBattle from './bot-battle'
import PvpBattle from './pvp-battle'

interface BattleRouterProps {
  battleId: number
}

export default function BattleRouter({ battleId }: BattleRouterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPvp = searchParams.get('pvp') === 'true'
  const cardIdsParam = searchParams.get('cards') ?? ''
  const selectedIds = cardIdsParam.split(',').map(Number).filter(Boolean)

  useEffect(() => {
    if (!isPvp && selectedIds.length === 0) {
      router.replace('/dashboard')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isPvp) {
    return <PvpBattle battleId={battleId} />
  }
  if (selectedIds.length === 0) {
    return null
  }
  return <BotBattle battleId={battleId} selectedIds={selectedIds} />
}
