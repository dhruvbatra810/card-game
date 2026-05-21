'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const NAV_LINKS = [
  { label: 'Deck', href: '/dashboard' },
  { label: 'Battle', href: '/battle' },
  { label: 'Profile', href: '/profile' },
  { label: 'Leaderboard', href: '/leaderboard' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ xp: number; coins: number; username: string } | null>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/me`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((data) => { if (data) setUser(data) })
      .catch(() => { toast.error('Failed to load user') })
  }, [])
  return (
    <nav className="z-50 bg-bg-2 border-b border-line h-14 flex items-center px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-8">
        <span className="bg-lime text-bg font-mono font-bold text-sm px-1.5 py-0.5 rounded-badge">
          &lt;/&gt;
        </span>
        <span className="font-display font-bold text-text tracking-wide text-sm uppercase">
          Repo Trumps
        </span>
        {!user && (
          <span className="text-text-mute font-mono text-chip ml-1">v0.1</span>
        )}
      </Link>

      {/* Nav links — only when logged in */}
      {user && (
        <div className="flex items-center gap-6 flex-1">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-btn font-display relative pb-0.5 transition-colors ${
                  active ? 'text-text' : 'text-text-mute hover:text-text-dim'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <>
            <span className="flex items-center gap-1.5 bg-bg-3 border border-line rounded-ctrl px-3 py-1 font-mono text-chip text-text-dim">
              <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block" />
              {user.xp.toLocaleString()} XP
            </span>
            <span className="flex items-center gap-1.5 bg-bg-3 border border-line rounded-ctrl px-3 py-1 font-mono text-chip text-text-dim">
              <span className="w-1.5 h-1.5 rounded-full bg-amber inline-block" />
              {user.coins} COINS
            </span>
            <div className="w-8 h-8 rounded-full bg-violet flex items-center justify-center text-bg font-bold text-chip uppercase">
              {user.username.slice(0, 2)}
            </div>
          </>
        ) : (
          <span className="bg-bg-3 border border-line rounded-ctrl px-3 py-1 font-mono text-chip text-text-mute">
            PHASE 1 · MVP
          </span>
        )}
      </div>
    </nav>
  )
}
