import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { apiUrl } from '../lib/api.js'
import {
  confirmBankConnection as confirmBankConnectionRequest,
  connectBank as connectBankRequest,
  disconnectBank as disconnectBankRequest,
} from '../services/profileService.js'

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
  const location = useLocation()
  const navigate = useNavigate()

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
  const [connectingBank, setConnectingBank] = useState(false)
  const [bankConnectMessage, setBankConnectMessage] = useState(null)

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

  // Open Finance redirects back here with status/connectionId query params
  // after the user completes (or cancels) the bank connect journey.
  useEffect(() => {
    if (!token) return undefined

    const params = new URLSearchParams(location.search)
    const connectionId = params.get('connectionId') || params.get('connection_id')
    const bankStatus = params.get('status') || params.get('paymentStatus')
    if (!connectionId && !bankStatus) return undefined

    let mounted = true

    async function confirm() {
      try {
        const data = await confirmBankConnectionRequest(token, { connectionId, status: bankStatus })
        if (!mounted) return
        setBankAccount(data.bankAccount || null)
        setBankConnectMessage({
          type: data.connected ? 'success' : 'error',
          text: data.connected
            ? 'Bank account connected. Transactions will sync automatically.'
            : 'Bank connection was not completed. You can try again.',
        })
      } catch (confirmError) {
        if (!mounted) return
        setBankConnectMessage({ type: 'error', text: confirmError.message || 'Unable to confirm bank connection' })
      } finally {
        navigate(location.pathname, { replace: true })
      }
    }

    confirm()
    return () => {
      mounted = false
    }
    // Intentionally run once per mount to process the redirect-back only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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

  const connectBankAccount = useCallback(async () => {
    if (!token) {
      return { ok: false, message: 'Missing access token' }
    }

    setConnectingBank(true)
    try {
      const result = await connectBankRequest(token, `${window.location.origin}/app/profile?section=payment`)
      if (!result.connectUrl) {
        throw new Error('Bank provider did not return a connect URL')
      }
      window.location.href = result.connectUrl
      return { ok: true }
    } catch (err) {
      setConnectingBank(false)
      return { ok: false, message: err.message }
    }
  }, [token])

  const disconnectBankAccount = useCallback(async () => {
    if (!token) {
      return { ok: false, message: 'Missing access token' }
    }

    setDisconnectingBank(true)
    try {
      const data = await disconnectBankRequest(token)
      setBankAccount(data.bankAccount || { connected: false, bankName: '', lastSyncedAt: null })
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err.message }
    } finally {
      setDisconnectingBank(false)
    }
  }, [token])

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
    connectBankAccount,
    disconnectBankAccount,
    bankConnectMessage,
    clearBankConnectMessage: () => setBankConnectMessage(null),
    pairing,
    loading,
    error,
    savingPrivacy,
    savingNotifications,
    savingSharedCategories,
    disconnectingPair,
    reconnectingPair,
    connectingBank,
    disconnectingBank,
    refetch: fetchSettings,
  }
}
