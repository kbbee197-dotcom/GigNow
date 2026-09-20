import React, { createContext, useContext, useEffect, useState } from 'react'
import { ID } from 'appwrite'
import { account } from './appwrite'

type AppUser = Awaited<ReturnType<typeof account.get>>

type AuthValue = {
  user: AppUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string, role: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    account
      .get()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    await account.createEmailPasswordSession({ email, password })
    setUser(await account.get())
  }

  async function signup(email: string, password: string, name: string, role: string) {
    await account.create({ userId: ID.unique(), email, password, name })
    await account.createEmailPasswordSession({ email, password })
    await account.updatePrefs({ prefs: { role } })
    setUser(await account.get())
  }

  async function logout() {
    await account.deleteSession({ sessionId: 'current' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
