import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function ProtectedRoute({ children, pairingMode = 'any' }) {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, pairingStatus, isPairingLoading } = useAuth()

  if (isBootstrapping || isPairingLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking session...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const isPaired = Boolean(pairingStatus?.paired)
  if (pairingMode === 'paired' && !isPaired) {
    return <Navigate to="/app/pairing" replace />
  }
  if (pairingMode === 'unpaired' && isPaired) {
    return <Navigate to="/app" replace />
  }

  return children
}

export default ProtectedRoute
