import { Navigate, useLocation } from 'react-router-dom'

function SessionGate({ isBootstrapping, message = 'Checking session...' }) {
  if (!isBootstrapping) return null

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
        {message}
      </div>
    </main>
  )
}

export function RedirectToLogin({ message }) {
  const location = useLocation()
  return <Navigate to="/login" replace state={{ from: location, sessionMessage: message }} />
}

export default SessionGate
