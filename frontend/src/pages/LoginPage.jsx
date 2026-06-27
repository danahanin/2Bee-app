import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import HoneycombBackground from '../components/design-system/HoneycombBackground.jsx'
import Hexagon from '../components/design-system/Hexagon.jsx'

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
      ? 'Account created successfully. You can sign in now.'
      : location.state?.sessionMessage || readStoredSessionMessage(),
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const result = await login(email, password)
    if (!result.ok) {
      setError(result.message || 'Login failed')
      return
    }

    navigate(result.paired ? '/app' : '/onboarding', { replace: true })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <HoneycombBackground />
      <section className="relative w-full max-w-md hive-card p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <Hexagon size={40} variant="filled">
            <span className="text-xs font-bold text-white">2B</span>
          </Hexagon>
          <p className="hive-eyebrow">2bee</p>
        </div>
        <h1 className="hive-title text-3xl">Welcome</h1>
        <p className="mt-2 text-sm text-[var(--brown-muted)]">Sign in to your shared finance hive.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="hive-input"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="hive-input"
              placeholder="Enter your password"
              required
            />
          </label>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          {successMessage ? <p className="text-sm font-medium text-emerald-600">{successMessage}</p> : null}

          <button type="submit" disabled={isLoading} className="hive-btn-primary w-full rounded-xl px-4 py-3 text-sm">
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-sm text-[var(--brown-muted)]">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-[var(--honey-700)] hover:text-[var(--honey-800)]">
            Create account
          </Link>
        </p>
        <p className="mt-2 text-xs text-[var(--brown-muted)]">Demo credentials are prefilled.</p>
      </section>
    </div>
  )
}

export default LoginPage
