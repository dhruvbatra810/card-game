'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get('code')
  useEffect(() => {
    if (!code) return
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/github/callback?code=${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.access_token) {
          document.cookie = `token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
          router.replace('/')
        }
      }).catch(()=>{
        router.replace('/')
      })
  }, [code, router])

  return (
    <div className="flex items-center justify-center min-h-screen font-mono text-text-mute">
      Logging in...
    </div>
  )
}
