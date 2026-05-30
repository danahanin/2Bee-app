import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const API_PREFIX = ''

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function parseApiError(res, fallbackMessage) {
  const body = await res.json().catch(() => null)
  return body?.error?.message || fallbackMessage
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
      if (view === 'balance') {
        setExpenses([])
        setPagination({ total: 0, page: 1, totalPages: 1 })
        return
      }
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
          throw new Error(await parseApiError(res, 'Failed to create expense'))
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

export function useUpdateExpense(hiveId) {
  const { token } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = useCallback(
    async (expenseId, data) => {
      if (!token || !hiveId) return { ok: false, message: 'Not ready' }
      setIsSubmitting(true)
      try {
        const res = await fetch(`${API_PREFIX}/hive/${hiveId}/expenses/${expenseId}`, {
          method: 'PUT',
          headers: authHeaders(token),
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          throw new Error(await parseApiError(res, 'Failed to update expense'))
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

  return { update, isSubmitting }
}

export function useDeleteExpense(hiveId) {
  const { token } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  const remove = useCallback(
    async (expenseId) => {
      if (!token || !hiveId) return { ok: false, message: 'Not ready' }
      setIsDeleting(true)
      try {
        const res = await fetch(`${API_PREFIX}/hive/${hiveId}/expenses/${expenseId}`, {
          method: 'DELETE',
          headers: authHeaders(token),
        })
        if (!res.ok) {
          throw new Error(await parseApiError(res, 'Failed to delete expense'))
        }
        return { ok: true }
      } catch (err) {
        return { ok: false, message: err.message }
      } finally {
        setIsDeleting(false)
      }
    },
    [hiveId, token],
  )

  return { remove, isDeleting }
}

export function useHiveBalance(hiveId) {
  const { token } = useAuth()
  const [balance, setBalance] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchBalance = useCallback(async () => {
    if (!token || !hiveId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_PREFIX}/hive/${hiveId}/balance`, { headers: authHeaders(token) })
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load hive balance'))
      setBalance(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [hiveId, token])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  return { balance, isLoading, error, refetch: fetchBalance }
}

export function useHiveTransfers(hiveId) {
  const { token } = useAuth()
  const [transfers, setTransfers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchTransfers = useCallback(async () => {
    if (!token || !hiveId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_PREFIX}/hive/${hiveId}/transfers`, { headers: authHeaders(token) })
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load transfer history'))
      const data = await res.json()
      setTransfers(data.items || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [hiveId, token])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  return { transfers, isLoading, error, refetch: fetchTransfers }
}

export function useHiveNotifications(hiveId) {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchNotifications = useCallback(async () => {
    if (!token || !hiveId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_PREFIX}/hive/${hiveId}/notifications`, { headers: authHeaders(token) })
      if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load hive notifications'))
      const data = await res.json()
      setNotifications(data.items || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [hiveId, token])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return { notifications, isLoading, error, refetch: fetchNotifications }
}

export function useCreateTransfer(hiveId) {
  const { token } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createTransfer = useCallback(
    async (data) => {
      if (!token || !hiveId) return { ok: false, message: 'Not ready' }
      setIsSubmitting(true)
      try {
        const res = await fetch(`${API_PREFIX}/hive/${hiveId}/transfers`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          throw new Error(await parseApiError(res, 'Failed to start transfer'))
        }
        return { ok: true, ...(await res.json()) }
      } catch (err) {
        return { ok: false, message: err.message }
      } finally {
        setIsSubmitting(false)
      }
    },
    [hiveId, token],
  )

  return { createTransfer, isSubmitting }
}
