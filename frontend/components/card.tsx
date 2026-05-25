export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type CardData = {
  id: number
  repo_name: string
  stars: number
  forks: number
  age_years: number
  contributors: number
  activity_score: number
  language: string | null
  rarity: Rarity
}

const RARITY_STYLES: Record<Rarity, { border: string; badge: string; text: string; glow: string; tint: string }> = {
  common:    { border: 'border-text-mute',        badge: 'bg-text-mute',        text: 'text-bg',       glow: '',                                      tint: '' },
  uncommon:  { border: 'border-line-2',           badge: 'bg-line-2',           text: 'text-text-dim', glow: '',                                      tint: '' },
  rare:      { border: 'border-rarity-rare',      badge: 'bg-rarity-rare',      text: 'text-bg',       glow: '0 0 12px 2px rgba(91,227,208,0.35)',    tint: 'rgba(91,227,208,0.05)' },
  epic:      { border: 'border-rarity-epic',      badge: 'bg-rarity-epic',      text: 'text-bg',       glow: '0 0 12px 2px rgba(180,140,255,0.4)',    tint: 'rgba(180,140,255,0.07)' },
  legendary: { border: 'border-rarity-legendary', badge: 'bg-rarity-legendary', text: 'text-bg',       glow: '0 0 16px 4px rgba(255,181,71,0.45)',    tint: 'rgba(255,181,71,0.07)' },
}

const LANGUAGE_MASCOT: Record<string, string> = {
  Python:     '🐍',
  JavaScript: '⚡',
  TypeScript: '🛡️',
  Rust:       '🦀',
  Go:         '🚀',
  Java:       '☕',
  Ruby:       '💎',
  PHP:        '🐘',
  'C++':      '⚙️',
  'C#':       '🎼',
  Swift:      '🦅',
  Kotlin:     '🐉',
  HTML:       '📜',
  CSS:        '🎨',
  Dart:       '🎯',
  Lua:        '🌙',
  Shell:      '🐚',
}

function formatStat(value: number | null | undefined): string {
  if (value == null) return '–'
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toString()
}

function activityLabel(score: number | null | undefined): string {
  if (score == null) return '–'
  if (score >= 70) return 'High'
  if (score >= 30) return 'Mid'
  return 'Low'
}

type CardProps = {
  card: CardData
  selected?: boolean
  onClick?: () => void
}

export default function Card({ card, selected = false, onClick }: CardProps) {
  const rarity = (card.rarity as Rarity) ?? 'common'
  const style = RARITY_STYLES[rarity] ?? RARITY_STYLES.common
  const mascot = card.language ? (LANGUAGE_MASCOT[card.language] ?? '📦') : '📦'
  const parts = card.repo_name?.split('/') ?? []
  const owner = parts[0] ?? 'unknown'
  const repo = parts[1] ?? parts[0] ?? 'unknown'
  const hp = (card.stars ?? 0) + (card.forks ?? 0) + Math.round((card.age_years ?? 0) * 10) + (card.contributors ?? 0)

  return (
    <button
      onClick={onClick}
      style={selected ? undefined : {
        ...(style.glow ? { boxShadow: style.glow } : {}),
        ...(style.tint ? { background: `linear-gradient(160deg, ${style.tint}, transparent 60%), var(--color-bg-3)` } : {}),
      }}
      className={`relative w-48 rounded-card border-2 bg-bg-3 flex flex-col overflow-hidden transition-all duration-200 text-left
        ${selected ? 'border-lime shadow-lime-halo scale-105' : `${style.border} hover:scale-102 hover:shadow-lime-halo`}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-chip text-text-mute">{owner}/</span>
          <span className="font-mono text-chip text-lime">HP {formatStat(hp)}</span>
        </div>
        <span className="font-mono text-sm font-bold text-text">{repo}</span>
      </div>

      {/* Language band */}
      {card.language && (
        <div className={`mx-3 mb-2 rounded-badge px-2 py-1 flex items-center gap-1.5 ${style.badge}`}>
          <span className="text-sm leading-none">{mascot}</span>
          <span className={`font-mono text-chip font-bold uppercase tracking-wide ${style.text}`}>
            {card.language}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="px-3 pb-2 flex flex-col gap-0 flex-1">
        {[
          { label: 'STARS',    value: formatStat(card.stars) },
          { label: 'FORKS',    value: formatStat(card.forks) },
          { label: 'AGE',      value: `${card.age_years}y` },
          { label: 'CONTRIB',  value: formatStat(card.contributors) },
          { label: 'ACTIVITY', value: activityLabel(card.activity_score) },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center justify-between py-1.5 border-b border-line last:border-0">
            <span className="font-mono text-chip text-text-mute">{stat.label}</span>
            <span className="font-mono text-chip text-text font-bold">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Rarity footer */}
      <div className={`mx-3 mb-3 rounded-badge py-1 text-center ${style.badge}`}>
        <span className={`font-mono text-chip font-bold uppercase tracking-widest ${style.text}`}>
          {rarity}
        </span>
      </div>
    </button>
  )
}
