import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { fetchPairStatus } from '../services/pairService.js'
import { useAuth } from '../context/AuthContext.jsx'

function LoadingState() {
  return (
    <main className="hive-auth-page">
      <div className="hive-auth-bg" aria-hidden="true" />
      <div className="hive-auth-card text-center">
        <span className="hive-spinner mx-auto" aria-label="Loading" />
        <p className="mt-4 text-sm font-semibold text-amber-900">Checking onboarding status…</p>
      </div>
    </main>
  )
}

function OnboardingGate({ children, allowIncomplete = false }) {
  const location = useLocation()
  const { token, logout } = useAuth()
  const [status, setStatus] = useState({ isLoading: true, paired: false, hiveId: null, error: '' })

  useEffect(() => {
    let mounted = true

    async function loadStatus() {
      setStatus((current) => ({ ...current, isLoading: true, error: '' }))
      try {
        const result = await fetchPairStatus(token)
        if (!mounted) return
        if (result.hiveId) window.localStorage.setItem('twobee_hive_id', result.hiveId)
        setStatus({ isLoading: false, paired: Boolean(result.paired), hiveId: result.hiveId ?? null, error: '' })
      } catch (error) {
        if (!mounted) return
        if (/token|session|unauthorized/i.test(error.message)) {
          await logout()
          return
        }
        setStatus({ isLoading: false, paired: false, hiveId: null, error: error.message })
      }
    }

    if (token) loadStatus()
    return () => { mounted = false }
  }, [location.key, logout, token])

  if (status.isLoading) return <LoadingState />
  if (status.error && !allowIncomplete) return <Navigate to="/onboarding" replace state={{ statusError: status.error }} />
  if (!status.paired && !allowIncomplete) return <Navigate to="/onboarding" replace state={{ from: location }} />
  if (status.paired && allowIncomplete) return <Navigate to="/app" replace />

  return children
}

export default OnboardingGate
