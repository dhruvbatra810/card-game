'use client'

export default function LoginButton() {
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
