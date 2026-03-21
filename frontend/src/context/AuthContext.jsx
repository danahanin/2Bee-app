/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const storageKey = 'twobee_auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  })
  const [isLoading, setIsLoading] = useState(false)

  const login = async (email, password) => {
    setIsLoading(true)
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to login')
      }

      const authPayload = { token: data.token, user: data.user }
      setUser(authPayload)
      localStorage.setItem(storageKey, JSON.stringify(authPayload))
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(storageKey)
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user?.token),
      isLoading,
      login,
      logout,
    }),
    [user, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
