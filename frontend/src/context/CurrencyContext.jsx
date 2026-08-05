/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { apiUrl } from '../lib/api.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { DEFAULT_CURRENCY } from '../constants/currencies.js'

const CurrencyContext = createContext(null)

// Same shape as backend STATIC_RATES: "1 ILS = rate[CODE] CODE".
// Used until /api/currency/rates loads, and as a fallback if a code is missing.
const FALLBACK_RATES = {
  ILS: 1,
  USD: 0.27,
  EUR: 0.25,
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (amount == null || Number.isNaN(Number(amount))) return 0
  if (fromCurrency === toCurrency) return Number(amount)

  const table = { ...FALLBACK_RATES, ...rates }
  const fromRate = table[fromCurrency]
  const toRate = table[toCurrency]
  if (fromRate == null || toRate == null || fromRate === 0) return Number(amount)

  // rates[code] is "1 ILS = rates[code] CODE"
  return (Number(amount) / fromRate) * toRate
}

async function fetchRates() {
  const response = await fetch(apiUrl('/api/currency/rates'))
  if (!response.ok) throw new Error('Failed to load exchange rates')
  return response.json()
}

async function fetchDisplayCurrency(token) {
  const response = await fetch(apiUrl('/api/settings/currency'), {
    method: 'GET',
    headers: authHeaders(token),
  })
  if (!response.ok) throw new Error('Failed to load currency preference')
  const data = await response.json()
  return data.displayCurrency || DEFAULT_CURRENCY
}

export function CurrencyProvider({ children }) {
  const { token } = useAuth()
  const [displayCurrency, setDisplayCurrencyState] = useState(DEFAULT_CURRENCY)
  const [rates, setRates] = useState(FALLBACK_RATES)
  const [base, setBase] = useState(DEFAULT_CURRENCY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRates()
      .then((data) => {
        setBase(data.base || DEFAULT_CURRENCY)
        setRates({ ...FALLBACK_RATES, ...(data.rates || {}) })
      })
      .catch((error) => console.warn('Falling back to default rates:', error.message))
  }, [])

  useEffect(() => {
    if (!token) {
      setDisplayCurrencyState(DEFAULT_CURRENCY)
      return
    }
    fetchDisplayCurrency(token)
      .then(setDisplayCurrencyState)
      .catch((error) => console.warn('Falling back to default display currency:', error.message))
  }, [token])

  const updateDisplayCurrency = useCallback(
    async (nextCurrency) => {
      if (!token) return { ok: false, message: 'Missing access token' }

      const previous = displayCurrency
      setDisplayCurrencyState(nextCurrency)
      setSaving(true)
      try {
        const response = await fetch(apiUrl('/api/settings/currency'), {
          method: 'PUT',
          headers: authHeaders(token),
          body: JSON.stringify({ displayCurrency: nextCurrency }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error?.message || 'Failed to update currency preference')
        const saved = data.displayCurrency || nextCurrency
        setDisplayCurrencyState(saved)
        return { ok: true, displayCurrency: saved }
      } catch (error) {
        setDisplayCurrencyState(previous)
        return { ok: false, message: error.message }
      } finally {
        setSaving(false)
      }
    },
    [displayCurrency, token],
  )

  const convertToDisplay = useCallback(
    (amount, fromCurrency = base) => convertAmount(amount, fromCurrency, displayCurrency, rates),
    [base, displayCurrency, rates],
  )

  const convertFromDisplay = useCallback(
    (amount, toCurrency = base) => convertAmount(amount, displayCurrency, toCurrency, rates),
    [base, displayCurrency, rates],
  )

  const formatBase = useCallback(
    (amountInBase, options) =>
      formatCurrency(convertToDisplay(amountInBase, base), { ...options, currency: displayCurrency }),
    [base, convertToDisplay, displayCurrency],
  )

  const formatNative = useCallback(
    (amount, currency = base, options) =>
      formatCurrency(amount, { ...options, currency: currency || base }),
    [base],
  )

  const formatConverted = useCallback(
    (amount, fromCurrency = base, options) =>
      formatCurrency(convertAmount(amount, fromCurrency || base, displayCurrency, rates), {
        ...options,
        currency: displayCurrency,
      }),
    [base, displayCurrency, rates],
  )

  const value = useMemo(
    () => ({
      base,
      displayCurrency,
      rates,
      saving,
      updateDisplayCurrency,
      convertToDisplay,
      convertFromDisplay,
      formatBase,
      formatNative,
      formatConverted,
    }),
    [
      base,
      convertFromDisplay,
      convertToDisplay,
      displayCurrency,
      formatBase,
      formatConverted,
      formatNative,
      rates,
      saving,
      updateDisplayCurrency,
    ],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
