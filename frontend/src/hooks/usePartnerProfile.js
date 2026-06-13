import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiUrl } from '../lib/api.js'

export function usePartnerProfile() {
  const { token } = useAuth()
  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchPartner = useCallback(async () => {
    if (!token) {
      setPartner(null)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/profile/partner'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load partner')
      const data = await res.json()
      setPartner(data.partner)
    } catch {
      setPartner(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPartner()
  }, [fetchPartner])

  return { partner, loading, refetch: fetchPartner }
}
