type StatsBarProps = {
  battles: number
  wins: number
  losses: number
  bestStreak: number
  xpLevel: number
}

type StatItem = {
  label: string
  value: string | number
  highlight?: boolean
}

export default function StatsBar({ battles, wins, losses, bestStreak, xpLevel }: StatsBarProps) {
  const stats: StatItem[] = [
    { label: 'BATTLES', value: battles },
    { label: 'WINS', value: wins, highlight: true },
    { label: 'LOSSES', value: losses },
    { label: 'BEST STREAK', value: bestStreak },
    { label: 'XP LEVEL', value: `L${xpLevel}` },
  ]

  return (
    <div className="flex items-center gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-0.5 bg-bg-3 border border-line rounded-panel px-3 py-2 flex-1"
        >
          <span className="font-mono text-chip text-text-mute uppercase tracking-widest whitespace-nowrap">
            {stat.label}
          </span>
          <span
            className={`font-display font-bold text-h3 leading-tight ${
              stat.highlight ? 'text-lime' : stat.label === 'LOSSES' ? 'text-rose' : 'text-text'
            }`}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  )
}
