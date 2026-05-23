import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiUrl } from '../lib/api.js'

const DEFAULT_PRIVACY = {
  hidePersonalIncome: false,
  hidePersonalExpenses: false,
  hidePersonalBalance: false,
}

const DEFAULT_NOTIFICATIONS = {
  budgetAlerts: true,
  imbalanceAlerts: true,
  newExpenseAlerts: true,
  weeklyDigest: false,
}

export const AVAILABLE_CATEGORIES = [
  'groceries',
  'rent',
  'utilities',
  'dining',
  'transport',
  'entertainment',
  'travel',
  'health',
  'subscriptions',
  'shopping',
]

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function parseResponse(response, fallbackMessage) {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || fallbackMessage)
  }
  return data
}

export function useSettings() {
  const { token, pairingStatus, refreshPairingStatus } = useAuth()

  const [privacySettings, setPrivacySettings] = useState(DEFAULT_PRIVACY)
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATIONS)
  const [sharedCategories, setSharedCategories] = useState([])
  const [bankAccount, setBankAccount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [savingPrivacy, setSavingPrivacy] = useState({})
  const [savingNotifications, setSavingNotifications] = useState({})
  const [savingSharedCategories, setSavingSharedCategories] = useState(false)
  const [disconnectingPair, setDisconnectingPair] = useState(false)
  const [reconnectingPair, setReconnectingPair] = useState(false)
  const [disconnectingBank, setDisconnectingBank] = useState(false)

  const fetchSettings = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError(null)
    try {
      const [privacy, notifications, profile] = await Promise.all([
        parseResponse(
          await fetch(apiUrl('/api/settings/privacy'), {
            method: 'GET',
            headers: authHeaders(token),
          }),
          'Failed to load privacy settings',
        ),
        parseResponse(
          await fetch(apiUrl('/api/settings/notifications'), {
            method: 'GET',
            headers: authHeaders(token),
          }),
          'Failed to load notification settings',
        ),
        parseResponse(
          await fetch(apiUrl('/api/profile'), {
            method: 'GET',
            headers: authHeaders(token),
          }),
          'Failed to load profile settings',
        ),
      ])

      setPrivacySettings({ ...DEFAULT_PRIVACY, ...privacy })
      setNotificationSettings({ ...DEFAULT_NOTIFICATIONS, ...notifications })
      setSharedCategories(profile.sharedCategories || [])
      setBankAccount(profile.bankAccount || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updatePrivacySettings = useCallback(
    async (patch) => {
      if (!token) {
        return { ok: false, message: 'Missing access token' }
      }

      const previous = privacySettings
      const fields = Object.keys(patch)
      const optimistic = { ...previous, ...patch }
      setPrivacySettings(optimistic)
      setSavingPrivacy((prev) => ({ ...prev, ...Object.fromEntries(fields.map((field) => [field, true])) }))

      try {
        const data = await parseResponse(
          await fetch(apiUrl('/api/settings/privacy'), {
            method: 'PUT',
            headers: authHeaders(token),
            body: JSON.stringify(patch),
          }),
          'Failed to update privacy settings',
        )
        setPrivacySettings({ ...DEFAULT_PRIVACY, ...data.privacySettings })
        return { ok: true, privacySettings: data.privacySettings }
      } catch (err) {
        setPrivacySettings(previous)
        return { ok: false, message: err.message }
      } finally {
        setSavingPrivacy((prev) => ({ ...prev, ...Object.fromEntries(fields.map((field) => [field, false])) }))
      }
    },
    [privacySettings, token],
  )

  const updateNotificationSettings = useCallback(
    async (patch) => {
      if (!token) {
        return { ok: false, message: 'Missing access token' }
      }

      const previous = notificationSettings
      const fields = Object.keys(patch)
      const optimistic = { ...previous, ...patch }
      setNotificationSettings(optimistic)
      setSavingNotifications((prev) => ({
        ...prev,
        ...Object.fromEntries(fields.map((field) => [field, true])),
      }))

      try {
        const data = await parseResponse(
          await fetch(apiUrl('/api/settings/notifications'), {
            method: 'PUT',
            headers: authHeaders(token),
            body: JSON.stringify(patch),
          }),
          'Failed to update notification settings',
        )
        setNotificationSettings({ ...DEFAULT_NOTIFICATIONS, ...data.notificationSettings })
        return { ok: true, notificationSettings: data.notificationSettings }
      } catch (err) {
        setNotificationSettings(previous)
        return { ok: false, message: err.message }
      } finally {
        setSavingNotifications((prev) => ({
          ...prev,
          ...Object.fromEntries(fields.map((field) => [field, false])),
        }))
      }
    },
    [notificationSettings, token],
  )

  const updateSharedCategories = useCallback(
    async (categories) => {
      if (!token) {
        return { ok: false, message: 'Missing access token' }
      }

      setSavingSharedCategories(true)
      try {
        const data = await parseResponse(
          await fetch(apiUrl('/api/settings/shared-categories'), {
            method: 'PUT',
            headers: authHeaders(token),
            body: JSON.stringify({ categories }),
          }),
          'Failed to update shared categories',
        )
        setSharedCategories(data.sharedCategories || [])
        return { ok: true, sharedCategories: data.sharedCategories || [] }
      } catch (err) {
        return { ok: false, message: err.message }
      } finally {
        setSavingSharedCategories(false)
      }
    },
    [token],
  )

  const disconnectPair = useCallback(async () => {
    if (!token) {
      return { ok: false, message: 'Missing access token' }
    }

    setDisconnectingPair(true)
    try {
      const data = await parseResponse(
        await fetch(apiUrl('/api/pair'), {
          method: 'DELETE',
          headers: authHeaders(token),
        }),
        'Failed to disconnect pair',
      )
      await refreshPairingStatus()
      return { ok: true, ...data }
    } catch (err) {
      return { ok: false, message: err.message }
    } finally {
      setDisconnectingPair(false)
    }
  }, [refreshPairingStatus, token])

  const reconnectPair = useCallback(
    async (payload) => {
      if (!token) {
        return { ok: false, message: 'Missing access token' }
      }

      setReconnectingPair(true)
      try {
        const data = await parseResponse(
          await fetch(apiUrl('/api/pair/reconnect'), {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify(payload),
          }),
          'Failed to reconnect pair',
        )
        await refreshPairingStatus()
        return { ok: true, ...data }
      } catch (err) {
        return { ok: false, message: err.message }
      } finally {
        setReconnectingPair(false)
      }
    },
    [refreshPairingStatus, token],
  )

  const disconnectBankAccount = useCallback(async () => {
    setDisconnectingBank(true)
    try {
      // Bank unlink endpoint is not available yet in this backend.
      await new Promise((resolve) => setTimeout(resolve, 700))
      setBankAccount(null)
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err.message }
    } finally {
      setDisconnectingBank(false)
    }
  }, [])

  const pairing = useMemo(
    () => ({
      paired: Boolean(pairingStatus?.paired),
      pairId: pairingStatus?.pairId || null,
      hiveId: pairingStatus?.hiveId || null,
    }),
    [pairingStatus?.hiveId, pairingStatus?.pairId, pairingStatus?.paired],
  )

  return {
    privacySettings,
    updatePrivacySettings,
    notificationSettings,
    updateNotificationSettings,
    sharedCategories,
    updateSharedCategories,
    disconnectPair,
    reconnectPair,
    bankAccount,
    disconnectBankAccount,
    pairing,
    loading,
    error,
    savingPrivacy,
    savingNotifications,
    savingSharedCategories,
    disconnectingPair,
    reconnectingPair,
    disconnectingBank,
    refetch: fetchSettings,
  }
}
