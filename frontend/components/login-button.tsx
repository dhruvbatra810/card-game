'use client'

import Link from "next/link"
import { useEffect, useState } from "react"

export default function ButtonSection() {
  const [storage,setStorage] = useState<string|null>(null)

  useEffect(()=>{
    setStorage( localStorage.getItem('token'))
  })

  if (storage) {
    return <Link href="/battle"    className="px-5 py-3 rounded-cta bg-lime text-bg font-display font-bold text-btn cursor-pointer hover:brightness-110 transition-all shadow-lime-glow">Battle</Link>
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
    const res = await fetch('http://localhost:8000/auth/github')
    const data = await res.json()
    window.location.href = data.url
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
