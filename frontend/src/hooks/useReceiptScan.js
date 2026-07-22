import { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { confirmReceipt, scanReceipt } from '../services/receiptService.js'

export function useReceiptScan() {
  const { token } = useAuth()
  const [draft, setDraft] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState(null)

  const reset = useCallback(() => {
    setDraft(null)
    setIsScanning(false)
    setIsConfirming(false)
    setError(null)
  }, [])

  const scan = useCallback(
    async (file) => {
      if (!token) {
        const message = 'Missing access token'
        setError(message)
        return { ok: false, message }
      }
      if (!file) {
        const message = 'An image file is required'
        setError(message)
        return { ok: false, message }
      }

      setIsScanning(true)
      setError(null)
      try {
        const nextDraft = await scanReceipt(token, file)
        setDraft(nextDraft)
        return { ok: true, draft: nextDraft }
      } catch (err) {
        const message = err.message || 'Failed to scan receipt'
        setError(message)
        return { ok: false, message }
      } finally {
        setIsScanning(false)
      }
    },
    [token],
  )

  const confirm = useCallback(
    async (payload) => {
      if (!token) {
        const message = 'Missing access token'
        setError(message)
        return { ok: false, message }
      }

      setIsConfirming(true)
      setError(null)
      try {
        const result = await confirmReceipt(token, payload)
        setDraft(null)
        return { ok: true, data: result }
      } catch (err) {
        const message = err.message || 'Failed to save receipt expense'
        setError(message)
        return { ok: false, message }
      } finally {
        setIsConfirming(false)
      }
    },
    [token],
  )

  return {
    draft,
    isScanning,
    isConfirming,
    error,
    scan,
    confirm,
    reset,
  }
}
