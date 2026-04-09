import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function PublicRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Preparing session...</div>
  }

  if (isAuthenticated) {
    const redirectTarget = location.state?.from ?? '/app'
    return <Navigate to={redirectTarget} replace />
  }

  return children
}

export default PublicRoute
