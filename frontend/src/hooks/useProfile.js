import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiUrl } from '../lib/api.js'

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function parseResponse(response, fallbackMessage) {
  // Tolerate empty bodies (e.g. 204) and HTML error pages from proxies/CDNs —
  // surfacing them as a readable error instead of an opaque JSON parse failure.
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      if (!response.ok) {
        throw new Error(`${fallbackMessage} (HTTP ${response.status})`)
      }
      throw new Error('Server returned an unexpected response.')
    }
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || `${fallbackMessage} (HTTP ${response.status})`)
  }
  return data || {}
}

export function useProfile() {
  const { token, currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setProfile(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await parseResponse(
        await fetch(apiUrl('/api/profile'), {
          method: 'GET',
          headers: authHeaders(token),
        }),
        'Failed to load profile',
      )
      setProfile(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback(
    async (payload) => {
      if (!token) {
        return { ok: false, message: 'Missing access token' }
      }

      setUpdating(true)
      setError(null)
      try {
        const data = await parseResponse(
          await fetch(apiUrl('/api/profile'), {
            method: 'PUT',
            headers: authHeaders(token),
            body: JSON.stringify(payload),
          }),
          'Failed to update profile',
        )

        setProfile(data.user)
        return { ok: true, user: data.user }
      } catch (err) {
        setError(err.message)
        return { ok: false, message: err.message }
      } finally {
        setUpdating(false)
      }
    },
    [token],
  )

  const fallbackProfile = profile || {
    id: currentUser?.id,
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    email: currentUser?.email || '',
    bio: '',
    avatarUrl: null,
    pairId: null,
    sharedCategories: [],
  }

  return {
    profile: fallbackProfile,
    loading,
    updating,
    error,
    updateProfile,
    refetch: fetchProfile,
  }
}
