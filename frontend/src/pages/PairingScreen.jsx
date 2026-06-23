import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function PairingScreen() {
  const navigate = useNavigate()
  const {
    pairingStatus,
    isPairingLoading,
    generatePairCode,
    joinPairCode,
    refreshPairingStatus,
  } = useAuth()

  const [mode, setMode] = useState('generate')
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isPaired = Boolean(pairingStatus?.paired)
  const canGoApp = isPaired && Boolean(pairingStatus?.hiveId)

  const expiryDate = pairingStatus?.codeExpiresAt ? new Date(pairingStatus.codeExpiresAt) : null
  const expiryText = expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate.toLocaleTimeString() : null

  if (canGoApp) {
    return <Navigate to="/app" replace />
  }

  const handleGenerate = async () => {
    setError('')
    setSuccess('')
    const result = await generatePairCode()
    if (!result.ok) {
      setError(result.message || 'Failed to generate code')
      return
    }
    setSuccess('Code generated. Share it with your partner.')
  }

  const handleJoin = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const code = codeInput.trim().toUpperCase()
    const result = await joinPairCode(code)
    if (!result.ok) {
      setError(result.message || 'Failed to join code')
      return
    }
    setSuccess('Pairing successful. Redirecting...')
    navigate('/app', { replace: true })
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl hive-card p-8 shadow-lg">
        <p className="hive-eyebrow">2bee</p>
        <h1 className="mt-3 hive-title text-3xl">Pair your account</h1>
        <p className="mt-2 text-sm text-[var(--brown-muted)]">
          Connect with your partner to unlock shared hive features.
        </p>

        <div className="mt-6 flex gap-2 rounded-xl bg-[var(--honey-50)] p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === 'generate' ? 'bg-white text-[var(--honey-800)] shadow-sm' : 'text-[var(--brown-muted)] hover:text-[var(--brown-text)]'
            }`}
            onClick={() => setMode('generate')}
          >
            Generate code
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === 'join' ? 'bg-white text-[var(--honey-800)] shadow-sm' : 'text-[var(--brown-muted)] hover:text-[var(--brown-text)]'
            }`}
            onClick={() => setMode('join')}
          >
            Enter code
          </button>
        </div>

        {mode === 'generate' ? (
          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPairingLoading}
              className="hive-btn-primary w-full rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPairingLoading ? 'Generating...' : 'Generate pair code'}
            </button>
            {pairingStatus?.code ? (
              <div className="rounded-xl border border-[var(--honey-200)] bg-[var(--honey-50)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--honey-800)]">Current code</p>
                <p className="mt-1 text-3xl font-bold tracking-[0.2em] text-[var(--brown-text)]">{pairingStatus.code}</p>
                {expiryText ? <p className="mt-1 text-xs text-[var(--honey-700)]">Expires at {expiryText}</p> : null}
              </div>
            ) : null}
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleJoin}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Partner code</span>
              <input
                type="text"
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                className="hive-input text-center text-xl font-semibold tracking-[0.2em]"
                placeholder="ABC123"
                minLength={6}
                maxLength={6}
                required
              />
            </label>
            <button
              type="submit"
              disabled={isPairingLoading}
              className="hive-btn-primary w-full rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPairingLoading ? 'Joining...' : 'Join pair'}
            </button>
          </form>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={refreshPairingStatus}
            className="text-sm font-medium text-[var(--brown-muted)] transition hover:text-[var(--brown-text)]"
          >
            Refresh status
          </button>
          <span className="text-xs text-slate-400">{isPairingLoading ? 'Working...' : 'Ready'}</span>
        </div>

        {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
        {success ? <p className="mt-3 text-sm font-medium text-emerald-600">{success}</p> : null}
      </section>
    </main>
  )
}

export default PairingScreen
