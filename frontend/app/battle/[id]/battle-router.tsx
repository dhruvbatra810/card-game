'use client'

import { useSearchParams } from 'next/navigation'
import BotBattle from './bot-battle'
import PvpBattle from './pvp-battle'

interface BattleRouterProps {
  battleId: number
}

export default function BattleRouter({ battleId }: BattleRouterProps) {
  const searchParams = useSearchParams()
  const isPvp = searchParams.get('pvp') === 'true'
  const cardIdsParam = searchParams.get('cards') ?? ''
  const selectedIds = cardIdsParam.split(',').map(Number).filter(Boolean)

  if (isPvp) {
    return <PvpBattle battleId={battleId} />
  }
  return <BotBattle battleId={battleId} selectedIds={selectedIds} />
}
