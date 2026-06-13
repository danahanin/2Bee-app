import { Navigate, useLocation } from 'react-router-dom'

function SessionGate({ isBootstrapping, message = 'Checking session...' }) {
  if (!isBootstrapping) return null

  return (
    <main className="hive-auth-page">
      <div className="hive-auth-bg" aria-hidden="true" />
      <div className="hive-auth-card text-center">
        <span className="hive-spinner mx-auto" aria-label="Loading" />
        <p className="mt-4 text-sm font-semibold text-amber-900">{message}</p>
      </div>
    </main>
  )
}

export function RedirectToLogin({ message }) {
  const location = useLocation()
  return <Navigate to="/login" replace state={{ from: location, sessionMessage: message }} />
}

export default SessionGate
