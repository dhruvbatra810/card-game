
const DEMO_CARDS = [
  {
    id: 1,
    repo_name: 'you/pixel-pong',
    stars: 1240,
    forks: 87,
    age_years: 2,
    contributors: 14,
    activity_score: 90,
    language: 'TypeScript',
    rarity: 'epic' as const,
  },
  {
    id: 2,
    repo_name: 'you/lunar-blog',
    stars: 412,
    forks: 31,
    age_years: 1,
    contributors: 6,
    activity_score: 60,
    language: 'JavaScript',
    rarity: 'rare' as const,
  },
  {
    id: 3,
    repo_name: 'you/rust-cli',
    stars: 142,
    forks: 8,
    age_years: 1,
    contributors: 3,
    activity_score: 40,
    language: 'Rust',
    rarity: 'uncommon' as const,
  },
]

export default function DemoCardStack() {
  return (
    <div className="relative w-56 h-80">
      {/* Card 3 — back, rotated right, lowest z */}
      <div className="absolute inset-0 z-10" style={{ transform: 'rotate(12deg) translateX(32px) translateY(8px)' }}>
        <DemoCard card={DEMO_CARDS[2]} />
      </div>

      {/* Card 2 — middle, rotated left */}
      <div className="absolute inset-0 z-20" style={{ transform: 'rotate(-6deg) translateX(-20px) translateY(4px)' }}>
        <DemoCard card={DEMO_CARDS[1]} />
      </div>

      {/* Card 1 — front, no rotation, highest z */}
      <div className="absolute inset-0 z-30">
        <DemoCard card={DEMO_CARDS[0]} />
      </div>
    </div>
  )
}

const RARITY_STYLES = {
  common:    { border: 'border-text-mute',         badge: 'bg-text-mute',         text: 'text-bg' },
  uncommon:  { border: 'border-line-2',            badge: 'bg-line-2',            text: 'text-text-dim' },
  rare:      { border: 'border-rarity-rare',       badge: 'bg-rarity-rare',       text: 'text-bg' },
  epic:      { border: 'border-rarity-epic',       badge: 'bg-rarity-epic',       text: 'text-bg' },
  legendary: { border: 'border-rarity-legendary',  badge: 'bg-rarity-legendary',  text: 'text-bg' },
}

const LANGUAGE_MASCOT: Record<string, string> = {
  Python: '🐍', JavaScript: '⚡', TypeScript: '🛡️', Rust: '🦀',
  Go: '🚀', Java: '☕', Ruby: '💎', PHP: '🐘', HTML: '📜', CSS: '🎨',
}

function formatStat(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString()
}

function activityLabel(score: number) {
  return score >= 70 ? 'High' : score >= 30 ? 'Mid' : 'Low'
}

type Rarity = keyof typeof RARITY_STYLES
type DemoCardData = { id: number; repo_name: string; stars: number; forks: number; age_years: number; contributors: number; activity_score: number; language: string; rarity: Rarity }

function DemoCard({ card }: { card: DemoCardData }) {
  const style = RARITY_STYLES[card.rarity] ?? RARITY_STYLES.common
  const mascot = LANGUAGE_MASCOT[card.language] ?? '📦'
  const [owner, repo] = card.repo_name.split('/')
  const hp = card.stars + card.forks + Math.round(card.age_years * 10) + card.contributors

  return (
    <div className={`w-full h-full rounded-card border-2 bg-bg-3 flex flex-col overflow-hidden ${style.border}`}>
      <div className="px-3 pt-3 pb-1 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-chip text-text-mute">{owner}/</span>
          <span className="font-mono text-chip text-lime">HP {formatStat(hp)}</span>
        </div>
        <span className="font-mono text-sm font-bold text-text">{repo}</span>
      </div>

      <div className={`mx-3 mb-2 rounded-badge px-2 py-1 flex items-center gap-1.5 ${style.badge}`}>
        <span className="text-sm leading-none">{mascot}</span>
        <span className={`font-mono text-chip font-bold uppercase tracking-wide ${style.text}`}>{card.language}</span>
      </div>

      <div className="px-3 pb-2 flex flex-col flex-1">
        {[
          { label: 'STARS',    value: formatStat(card.stars) },
          { label: 'FORKS',    value: formatStat(card.forks) },
          { label: 'AGE',      value: `${card.age_years}y` },
          { label: 'CONTRIB',  value: formatStat(card.contributors) },
          { label: 'ACTIVITY', value: activityLabel(card.activity_score) },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center justify-between py-1 border-b border-line last:border-0">
            <span className="font-mono text-chip text-text-mute">{stat.label}</span>
            <span className="font-mono text-chip text-text font-bold">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className={`mx-3 mb-3 rounded-badge py-1 text-center ${style.badge}`}>
        <span className={`font-mono text-chip font-bold uppercase tracking-widest ${style.text}`}>{card.rarity}</span>
      </div>
    </div>
  )
}
