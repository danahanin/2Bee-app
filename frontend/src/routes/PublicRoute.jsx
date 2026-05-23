import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import SessionGate from '../components/SessionGate.jsx'

function PublicRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, pairingStatus, isPairingLoading } = useAuth()

  if (isBootstrapping || isPairingLoading) {
    return <SessionGate isBootstrapping message="Preparing session..." />
  }

  if (isAuthenticated) {
    const isPaired = Boolean(pairingStatus?.paired)
    const redirectTarget = location.state?.from ?? (isPaired ? '/app' : '/onboarding')
    return <Navigate to={redirectTarget} replace />
  }

  return children
}

export default PublicRoute
