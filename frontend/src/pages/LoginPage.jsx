import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import HiveAuthLayout, { HiveAuthInput, HiveAuthButton } from '../components/hive/HiveAuthLayout.jsx'

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
    <HiveAuthLayout title="Welcome back, bee!" subtitle="Sign in to enter the hive.">
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <HiveAuthInput
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
        <HiveAuthInput
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
        />

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        {successMessage ? <p className="text-sm font-medium text-emerald-700">{successMessage}</p> : null}

        <HiveAuthButton disabled={isLoading}>{isLoading ? 'Signing in…' : 'Enter the hive'}</HiveAuthButton>
      </form>

      <p className="mt-4 text-center text-sm text-amber-900/75">
        New here?{' '}
        <Link to="/signup" className="font-bold text-amber-800 underline hover:text-amber-950">
          Create account
        </Link>
      </p>
    </HiveAuthLayout>
  )
}

export default LoginPage
