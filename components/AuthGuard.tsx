'use client'

import { useAuth } from './AuthProvider'
import LoginPage from './LoginPage'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, authorized } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 animate-pulse" />
          <p className="text-slate-500 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user || !authorized) {
    return <LoginPage />
  }

  return <>{children}</>
}
