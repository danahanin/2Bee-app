import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import SessionGate from '../components/SessionGate.jsx'

function ProtectedRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <SessionGate isBootstrapping={isBootstrapping} />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location, sessionMessage: 'Please sign in to continue.' }} />
  }

  return children
}

export default ProtectedRoute
