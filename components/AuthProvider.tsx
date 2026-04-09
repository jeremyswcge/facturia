'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { onAuthChange, isAuthorized } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  authorized: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authorized: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, authorized: isAuthorized(user?.email ?? null) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
