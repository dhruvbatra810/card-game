'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get('code')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) {
      setError('No OAuth code received. Please try logging in again.')
      return
    }
    const params = new URLSearchParams({ code })
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/github/callback?${params}`)
      .then((r) => {
        if (!r.ok) {
          return r.text().then((body) => { throw new Error(body || r.statusText) })
        }
        return r.json()
      })
      .then((data) => {
        if (data.access_token) {
          document.cookie = `token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`
          router.replace('/')
        } else {
          setError('Login failed: no token received.')
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Login failed.')
      })
  }, [code, router])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen font-mono gap-3">
        <span className="text-red-400">{error}</span>
        <button onClick={() => router.replace('/')} className="underline text-text-mute">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen font-mono text-text-mute">
      Logging in...
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen font-mono text-text-mute">
        Logging in...
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
