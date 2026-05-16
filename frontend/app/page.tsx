import LoginButton from '@/components/login-button'
import DemoCardStack from '@/components/demo-card'
import ButtonSection from '@/components/login-button'



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

       <ButtonSection/>

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
        <DemoCardStack />
      </div>
    </main>
  )
}
