import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function PublicRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, pairingStatus, isPairingLoading } = useAuth()

  if (isBootstrapping || isPairingLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Preparing session...</div>
  }

  if (isAuthenticated) {
    const isPaired = Boolean(pairingStatus?.paired)
    const redirectTarget = location.state?.from ?? (isPaired ? '/app' : '/app/pairing')
    return <Navigate to={redirectTarget} replace />
  }

  return children
}

export default PublicRoute
