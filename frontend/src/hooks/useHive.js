import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const API_PREFIX = ''

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export function useHive(hiveId) {
  const { token } = useAuth()
  const [hive, setHive] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchHive = useCallback(async () => {
    if (!hiveId || !token) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_PREFIX}/hive/${hiveId}`, { headers: authHeaders(token) })
      if (!res.ok) throw new Error('Failed to load Hive')
      setHive(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [hiveId, token])

  useEffect(() => {
    fetchHive()
  }, [fetchHive])

  return { hive, isLoading, error, refetch: fetchHive }
}

export function useExpenses(hiveId, view) {
  const { token } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchExpenses = useCallback(
    async (page = 1) => {
      if (!token) return
      setIsLoading(true)
      setError(null)
      try {
        const url =
          view === 'shared'
            ? `${API_PREFIX}/hive/${hiveId}/expenses?page=${page}`
            : `${API_PREFIX}/expenses/personal?page=${page}`

        const res = await fetch(url, { headers: authHeaders(token) })
        if (!res.ok) throw new Error('Failed to load expenses')
        const data = await res.json()
        setExpenses(data.expenses)
        setPagination({ total: data.total, page: data.page, totalPages: data.totalPages })
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    },
    [hiveId, view, token],
  )

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  return { expenses, pagination, isLoading, error, refetch: fetchExpenses }
}

export function useCreateExpense(hiveId) {
  const { token } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const create = useCallback(
    async (data) => {
      if (!token || !hiveId) return { ok: false, message: 'Not ready' }
      setIsSubmitting(true)
      try {
        const res = await fetch(`${API_PREFIX}/hive/${hiveId}/expenses`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error?.message || 'Failed to create expense')
        }
        return { ok: true, expense: await res.json() }
      } catch (err) {
        return { ok: false, message: err.message }
      } finally {
        setIsSubmitting(false)
      }
    },
    [hiveId, token],
  )

  return { create, isSubmitting }
}
