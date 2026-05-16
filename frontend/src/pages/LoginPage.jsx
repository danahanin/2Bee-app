import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchPairStatus } from '../services/pairService.js'

function readStoredSessionMessage() {
  const message = window.localStorage.getItem('twobee_session_message') || ''
  if (message) {
    window.localStorage.removeItem('twobee_session_message')
  }
  return message
}

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState(location.state?.registeredEmail || 'demo@2bee.app')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')
  const [successMessage] = useState(
    location.state?.registrationSuccess
      ? 'Account created. You can sign in now.'
      : location.state?.sessionMessage || readStoredSessionMessage()
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const result = await login(email, password)
    if (!result.ok) {
      setError(result.message || 'Login failed')
      return
    }

    try {
      const stored = JSON.parse(window.localStorage.getItem('twobee_auth') || '{}')
      const pairStatus = await fetchPairStatus(stored.accessToken || stored.token)
      if (pairStatus.hiveId) {
        window.localStorage.setItem('twobee_hive_id', pairStatus.hiveId)
      }
      navigate(pairStatus.paired ? '/app' : '/onboarding', { replace: true })
    } catch {
      navigate('/onboarding', { replace: true })
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">2Bee</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Welcome</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to continue to your shared finance hub.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Enter your password"
              required
            />
          </label>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          {successMessage ? <p className="text-sm font-medium text-emerald-600">{successMessage}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Create account
          </Link>
        </p>
        <p className="mt-2 text-xs text-slate-500">Demo credentials are prefilled for this initial slice.</p>
      </section>
    </main>
  )
}

export default LoginPage
