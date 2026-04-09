/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const storageKey = 'twobee_auth'

function parseStoredSession() {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const token = parsed.accessToken || parsed.token
    if (!token || !parsed.user) {
      localStorage.removeItem(storageKey)
      return null
    }

    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(storageKey)
      return null
    }

    return {
      token,
      user: parsed.user,
      expiresAt: parsed.expiresAt || null,
    }
  } catch (error) {
    console.warn('Failed to restore auth session', error)
    localStorage.removeItem(storageKey)
    return null
  }
}

function persistSession(session) {
  localStorage.setItem(storageKey, JSON.stringify(session))
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => parseStoredSession())
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
        throw new Error(data.error?.message || 'Unable to login')
      }

      const authPayload = {
        token: data.accessToken,
        user: data.user,
        expiresAt: data.expiresAt,
      }
      setSession(authPayload)
      persistSession(authPayload)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      if (session?.token) {
        await fetch('/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })
      }
    } catch (error) {
      console.warn('Logout failed', error)
    } finally {
      setSession(null)
      localStorage.removeItem(storageKey)
    }
  }

  const value = useMemo(
    () => ({
      session,
      currentUser: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isLoading,
      login,
      logout,
    }),
    [session, isLoading],
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
