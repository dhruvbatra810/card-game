import ButtonSection from '@/components/login-button'
import Card, { type CardData } from '@/components/card'

const DEMO_CARDS: CardData[] = [
  { id: 1, repo_name: 'you/pixel-pong',  stars: 1240, forks: 87, age_years: 2, contributors: 14, activity_score: 90, language: 'TypeScript', rarity: 'epic' },
  { id: 2, repo_name: 'you/lunar-blog',  stars: 412,  forks: 31, age_years: 1, contributors: 6,  activity_score: 60, language: 'JavaScript', rarity: 'rare' },
  { id: 3, repo_name: 'you/rust-cli',    stars: 142,  forks: 8,  age_years: 1, contributors: 3,  activity_score: 40, language: 'Rust',       rarity: 'uncommon' },
]

export default function LandingPage() {
  return (
    <main className="flex-1 flex items-center px-12 lg:px-24 gap-16 min-h-[calc(100vh-56px)]">
      {/* Left — copy */}
      <div className="flex flex-col gap-6 max-w-lg">
        <span className="font-mono text-eyebrow text-text-mute tracking-widest">
          A CARD BATTLE GAME FOR DEVS
        </span>

        <h1 className="font-display text-hero font-bold leading-tight text-text">
          Your repos<br />
          are <span className="text-lime">trading cards.</span><br />
          Now go fight.
        </h1>

        <p className="text-lede text-text-dim max-w-sm">
          Pull your top GitHub repos into a deck. Compare stats —
          stars, forks, age, contributors, activity. Best of 5
          rounds. Any repo can win.
        </p>

        <ButtonSection />

        <div className="flex items-center gap-6 mt-2">
          <span className="flex items-center gap-1.5 font-mono text-chip text-text-mute">
            <span className="w-1.5 h-1.5 rounded-full bg-lime" />
            READ-ONLY ACCESS
          </span>
          <span className="flex items-center gap-1.5 font-mono text-chip text-text-mute">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
            ~2 MIN MATCHES
          </span>
          <span className="flex items-center gap-1.5 font-mono text-chip text-text-mute">
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            FREE FOREVER
          </span>
        </div>
      </div>

      {/* Right — stacked cards */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-56 h-80">
          <div className="absolute inset-0 z-10" style={{ transform: 'rotate(22deg) translateX(48px) translateY(12px)' }}>
            <Card card={DEMO_CARDS[2]} />
          </div>
          <div className="absolute inset-0 z-20" style={{ transform: 'rotate(-12deg) translateX(-32px) translateY(6px)' }}>
            <Card card={DEMO_CARDS[1]} />
          </div>
          <div className="absolute inset-0 z-30">
            <Card card={DEMO_CARDS[0]} />
          </div>
        </div>
      </div>
    </main>
  )
}
