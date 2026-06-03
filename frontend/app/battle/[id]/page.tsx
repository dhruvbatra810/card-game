'use client'

import { useParams } from 'next/navigation'
import BattleRouter from './battle-router'

export default function BattlePage() {
  const params = useParams()
  const battleId = Number(params.id)
  return <BattleRouter battleId={battleId} />
}
