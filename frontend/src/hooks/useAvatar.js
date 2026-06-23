import { useCallback, useState } from 'react'
import { apiUrl } from '../lib/api.js'

function getToken() {
  const stored = localStorage.getItem('twobee_auth')
  if (!stored) return null
  try {
    const { accessToken, token } = JSON.parse(stored)
    return accessToken || token
  } catch {
    return null
  }
}

async function parseError(res) {
  const body = await res.json().catch(() => null)
  throw new Error(body?.error?.message || `Request failed (${res.status})`)
}

export function useAvatar({ onSaved } = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const uploadAvatar = useCallback(async (file) => {
    const token = getToken()
    if (!token) throw new Error('Not authenticated')

    const formData = new FormData()
    formData.append('image', file)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/profile/avatar/upload'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) await parseError(res)
      const data = await res.json()
      setPreviewUrl(data.avatarUrl)
      onSaved?.(data.user)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [onSaved])

  const generateBeeSelf = useCallback(async (file) => {
    const token = getToken()
    if (!token) throw new Error('Not authenticated')

    const formData = new FormData()
    formData.append('photo', file)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/profile/avatar/bee-self'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) await parseError(res)
      const data = await res.json()
      setPreviewUrl(data.previewUrl || data.avatarUrl)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const setAvatar = useCallback(async ({ avatarUrl, avatarType }) => {
    const token = getToken()
    if (!token) throw new Error('Not authenticated')

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/profile/avatar'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarUrl, avatarType }),
      })
      if (!res.ok) await parseError(res)
      const data = await res.json()
      setPreviewUrl(avatarUrl)
      onSaved?.(data.user)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [onSaved])

  return {
    loading,
    error,
    previewUrl,
    setPreviewUrl,
    uploadAvatar,
    generateBeeSelf,
    setAvatar,
  }
}
