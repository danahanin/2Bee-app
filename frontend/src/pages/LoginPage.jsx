import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('demo@2bee.app')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const result = await login(email, password)
    if (!result.ok) {
      setError(result.message || 'Login failed')
      return
    }

    navigate('/app', { replace: true })
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">Demo credentials are prefilled for this initial slice.</p>
      </section>
    </main>
  )
}

export default LoginPage
