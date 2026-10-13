import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ExternalLink, LogOut } from 'lucide-react'
import { AuthProvider, useAuth } from './AuthContext'

function Gate() {
  const { email, checking, logout } = useAuth()
  const location = useLocation()

  if (checking) return <div className="grid min-h-svh place-items-center text-muted">Loading…</div>
  if (!email) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  return (
    <div className="min-h-svh bg-panel">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/admin" className="text-lg font-semibold tracking-tight">Admin</Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">{email}</span>
            <Link to="/" target="_blank" className="flex items-center gap-1.5 hover:text-accent">
              View site <ExternalLink className="size-4" />
            </Link>
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 hover:bg-panel">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}

export default function AdminLayout() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
