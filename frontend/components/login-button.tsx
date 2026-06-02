'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ButtonSection() {
  const [storage,setStorage] = useState<string|null>(null)
  const router = useRouter()

  useEffect(()=>{
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/)
    const token = match ? match[1] : null
    setStorage(token)
  },[])

  function handleGoToDeck() {
    toast.loading('Loading your deck...')
    router.push('/dashboard')
  }

  if (storage) {
    return (
      <button
        onClick={handleGoToDeck}
        className="px-5 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn cursor-pointer hover:brightness-110 transition-all shadow-lime-glow"
      >
        Go to Deck
      </button>
    )
  }
  return <div className="flex items-center gap-3">
    <LoginButton />
    <button
      disabled
      className="px-5 py-3 rounded-cta border border-line text-text-mute font-display text-btn cursor-not-allowed opacity-40"
    >
      Play as Guest →
    </button>
  </div>
}

function LoginButton() {
  async function handleLogin() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/github`)
      if (!res.ok) throw new Error(res.statusText)
      const data = await res.json()
      if (!data?.url) throw new Error('No redirect URL returned.')
      window.location.href = data.url
    } catch (err) {
      console.error('GitHub login failed:', err)
      alert('Login failed. Please try again.')
    }
  }

  return (
    <button
      onClick={handleLogin}
      className="px-5 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn cursor-pointer hover:brightness-110 transition-all shadow-lime-glow"
    >
      &gt; Sign in with GitHub
    </button>
  )
}
