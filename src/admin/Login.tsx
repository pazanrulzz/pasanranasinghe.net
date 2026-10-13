import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'

function LoginForm() {
  const { email: current, checking, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (checking) return <div className="grid min-h-svh place-items-center text-muted">Loading…</div>
  if (current) return <Navigate to="/admin" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate((location.state as { from?: string } | null)?.from ?? '/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-svh place-items-center bg-panel px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-medium tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted">Manage your portfolio items.</p>

        <label className="mt-6 block text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-accent"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-accent"
        />

        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          disabled={busy}
          className="mt-6 h-11 w-full rounded-lg bg-accent font-medium text-white transition hover:bg-accent-dark disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

export default function Login() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  )
}
