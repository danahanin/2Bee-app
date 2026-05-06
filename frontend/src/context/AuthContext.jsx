/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiUrl } from '../lib/api.js'

const AuthContext = createContext(null)
const storageKey = 'twobee_auth'
const REFRESH_MARGIN_MS = 60 * 1000

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseStoredSession() {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const token = parsed.accessToken || parsed.token
    const refreshToken = parsed.refreshToken || null
    if (!token || !parsed.user) {
      window.localStorage.removeItem(storageKey)
      return null
    }

    const expiresAt = parsed.expiresAt || null
    const refreshExpiresAt = parsed.refreshExpiresAt || null

    if (refreshToken && refreshExpiresAt && new Date(refreshExpiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(storageKey)
      return null
    }

    if (!refreshToken && expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(storageKey)
      return null
    }

    return {
      token,
      user: parsed.user,
      expiresAt,
      refreshToken,
      refreshExpiresAt,
    }
  } catch (error) {
    console.warn('Failed to restore auth session', error)
    window.localStorage.removeItem(storageKey)
    return null
  }
}

function persistSession(session) {
  if (!isBrowser()) return
  window.localStorage.setItem(storageKey, JSON.stringify(session))
}

function clearStoredSession() {
  if (!isBrowser()) return
  window.localStorage.removeItem(storageKey)
}

function shouldRefreshSoon(expiresAt) {
  if (!expiresAt) return false
  const expireMs = new Date(expiresAt).getTime()
  if (Number.isNaN(expireMs)) return false
  return expireMs - Date.now() <= REFRESH_MARGIN_MS
}

function toSessionValue(payload) {
  const token = payload?.accessToken || payload?.token || null
  const refreshToken = payload?.refreshToken || null
  if (!token || !refreshToken || !payload?.user) {
    throw new Error('Incomplete auth payload')
  }

  return {
    token,
    user: payload.user,
    expiresAt: payload.expiresAt ?? null,
    refreshToken,
    refreshExpiresAt: payload.refreshExpiresAt ?? null,
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => parseStoredSession())
  const [isLoading, setIsLoading] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const refreshPromiseRef = useRef(null)

  const setAndPersistSession = useCallback((nextSession) => {
    setSession(nextSession)
    if (nextSession) {
      persistSession(nextSession)
    } else {
      clearStoredSession()
    }
  }, [])

  const refreshWithToken = useCallback(
    async (refreshTokenValue) => {
      if (!refreshTokenValue) {
        return { ok: false, message: 'Missing refresh token' }
      }

      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current
      }

      const promise = (async () => {
        try {
          const response = await fetch(apiUrl('/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: refreshTokenValue }),
          })
          const data = await response.json()
          if (!response.ok) {
            throw new Error(data.error?.message || 'Unable to refresh session')
          }

          const next = toSessionValue(data)
          setAndPersistSession(next)
          return { ok: true, session: next }
        } catch (error) {
          console.warn('Session refresh failed', error)
          setAndPersistSession(null)
          return { ok: false, message: error.message }
        } finally {
          refreshPromiseRef.current = null
        }
      })()

      refreshPromiseRef.current = promise
      return promise
    },
    [setAndPersistSession],
  )

  const refreshSession = useCallback(() => refreshWithToken(session?.refreshToken ?? null), [refreshWithToken, session?.refreshToken])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        const stored = parseStoredSession()
        if (stored) {
          setAndPersistSession(stored)
          if (stored.refreshToken && (!stored.expiresAt || shouldRefreshSoon(stored.expiresAt))) {
            const result = await refreshWithToken(stored.refreshToken)
            if (!result.ok && !cancelled) {
              setAndPersistSession(null)
            }
          }
        } else {
          clearStoredSession()
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [refreshWithToken, setAndPersistSession])

  useEffect(() => {
    if (!session?.refreshToken || !session?.expiresAt) {
      return undefined
    }

    const expiresAtMs = new Date(session.expiresAt).getTime()
    if (Number.isNaN(expiresAtMs)) {
      return undefined
    }

    const delay = Math.max(expiresAtMs - Date.now() - REFRESH_MARGIN_MS, 0)
    const handle = setTimeout(() => {
      refreshSession()
    }, delay)

    return () => clearTimeout(handle)
  }, [refreshSession, session?.expiresAt, session?.refreshToken])

  const login = useCallback(
    async (email, password) => {
      setIsLoading(true)
      try {
        const response = await fetch(apiUrl('/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error?.message || 'Unable to login')
        }

        const next = toSessionValue(data)
        setAndPersistSession(next)
        return { ok: true }
      } catch (error) {
        return { ok: false, message: error.message }
      } finally {
        setIsLoading(false)
      }
    },
    [setAndPersistSession],
  )

  const logout = useCallback(async () => {
    try {
      if (session?.token || session?.refreshToken) {
        const headers = session?.token ? { Authorization: `Bearer ${session.token}` } : {}
        await fetch(apiUrl('/auth/logout'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(session?.refreshToken ? { refreshToken: session.refreshToken } : {}),
        })
      }
    } catch (error) {
      console.warn('Logout failed', error)
    } finally {
      setAndPersistSession(null)
    }
  }, [session, setAndPersistSession])

  const value = useMemo(
    () => ({
      session,
      currentUser: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isLoading,
      isBootstrapping,
      login,
      logout,
      refreshSession,
    }),
    [session, isBootstrapping, isLoading, login, logout, refreshSession],
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
