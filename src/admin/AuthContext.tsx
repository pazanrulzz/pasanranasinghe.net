import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../lib/api'

interface Ctx {
  email: string | null
  checking: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    api
      .me()
      .then((r) => setEmail(r.email))
      .catch(() => setEmail(null))
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async (e: string, p: string) => {
    const r = await api.login(e, p)
    setEmail(r.email)
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setEmail(null)
  }, [])

  const value = useMemo(() => ({ email, checking, login, logout }), [email, checking, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
