import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import SessionGate from '../components/SessionGate.jsx'

function ProtectedRoute({ children, pairingMode = 'any' }) {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, pairingStatus } = useAuth()

  if (isBootstrapping) {
    return <SessionGate isBootstrapping message="Checking session..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location, sessionMessage: 'Please sign in to continue.' }} />
  }

  const isPaired = Boolean(pairingStatus?.paired)
  if (pairingMode === 'paired' && !isPaired) {
    return <Navigate to="/onboarding" replace />
  }
  if (pairingMode === 'unpaired' && isPaired) {
    return <Navigate to="/app" replace />
  }

  return children
}

export default ProtectedRoute
