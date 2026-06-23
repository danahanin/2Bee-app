import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import HoneycombBackground from '../components/design-system/HoneycombBackground.jsx'
import Hexagon from '../components/design-system/Hexagon.jsx'

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
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <HoneycombBackground />
      <section className="relative w-full max-w-md hive-card p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <Hexagon size={40} variant="filled">
            <span className="text-xs font-bold text-white">2B</span>
          </Hexagon>
          <p className="hive-eyebrow">2bee</p>
        </div>
        <h1 className="hive-title text-3xl">Create account</h1>
        <p className="mt-2 text-sm text-[var(--brown-muted)]">Sign up to start managing shared finances.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">First name</span>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="hive-input" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Last name</span>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="hive-input" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="hive-input" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="hive-input" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Confirm password</span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="hive-input" required />
          </label>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

          <button type="submit" disabled={isLoading} className="hive-btn-primary w-full rounded-xl px-4 py-3 text-sm">
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-sm text-[var(--brown-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[var(--honey-700)]">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  )
}

export default SignupPage
