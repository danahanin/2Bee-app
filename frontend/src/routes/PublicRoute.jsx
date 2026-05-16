import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import SessionGate from '../components/SessionGate.jsx'

function PublicRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <SessionGate isBootstrapping={isBootstrapping} message="Preparing session..." />
  }

  if (isAuthenticated) {
    const redirectTarget = location.state?.from ?? '/app'
    return <Navigate to={redirectTarget} replace />
  }

  return children
}

export default PublicRoute
