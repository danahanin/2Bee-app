import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import HiveAuthLayout, { HiveAuthInput, HiveAuthButton } from '../components/hive/HiveAuthLayout.jsx'

function SignupPage() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const result = await register({ firstName, lastName, email, password })
    if (!result.ok) {
      setError(result.message || 'Sign up failed')
      return
    }

    navigate('/login', {
      replace: true,
      state: { registrationSuccess: true, registeredEmail: email },
    })
  }

  return (
    <HiveAuthLayout title="Join the hive" subtitle="Create your account and start buzzing together.">
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <HiveAuthInput
          label="First name"
          type="text"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="Dana"
          required
        />
        <HiveAuthInput
          label="Last name"
          type="text"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Hanin"
          required
        />
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
          placeholder="At least 8 characters"
          required
        />
        <HiveAuthInput
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat password"
          required
        />

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

        <HiveAuthButton disabled={isLoading}>{isLoading ? 'Creating account…' : 'Create account'}</HiveAuthButton>
      </form>

      <p className="mt-4 text-center text-sm text-amber-900/75">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-amber-800 underline hover:text-amber-950">
          Sign in
        </Link>
      </p>
    </HiveAuthLayout>
  )
}

export default SignupPage
