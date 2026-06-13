import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import HiveAuthLayout, { HiveAuthInput, HiveAuthButton } from '../components/hive/HiveAuthLayout.jsx'

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
    setSuccess('Pairing successful. Redirecting…')
    navigate('/app', { replace: true })
  }

  return (
    <HiveAuthLayout title="Pair your hive" subtitle="Connect with your partner to unlock shared chambers.">
      <div className="hive-auth-tabs">
        <button
          type="button"
          className={`hive-auth-tab ${mode === 'generate' ? 'hive-auth-tab-active' : ''}`}
          onClick={() => setMode('generate')}
        >
          Generate code
        </button>
        <button
          type="button"
          className={`hive-auth-tab ${mode === 'join' ? 'hive-auth-tab-active' : ''}`}
          onClick={() => setMode('join')}
        >
          Enter code
        </button>
      </div>

      {mode === 'generate' ? (
        <div className="mt-4 space-y-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPairingLoading}
            className="hive-auth-button disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPairingLoading ? 'Generating…' : 'Generate pair code'}
          </button>
          {pairingStatus?.code ? (
            <div className="hive-auth-code-box">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Current code</p>
              <p className="hive-auth-code-value">{pairingStatus.code}</p>
              {expiryText ? <p className="mt-1 text-xs text-amber-800/75">Expires at {expiryText}</p> : null}
            </div>
          ) : null}
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleJoin}>
          <HiveAuthInput
            label="Partner code"
            type="text"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
            className="text-center text-xl font-bold tracking-[0.2em]"
            placeholder="ABC123"
            minLength={6}
            maxLength={6}
            required
          />
          <HiveAuthButton disabled={isPairingLoading}>{isPairingLoading ? 'Joining…' : 'Join pair'}</HiveAuthButton>
        </form>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={refreshPairingStatus}
          className="font-semibold text-amber-800 underline hover:text-amber-950"
        >
          Refresh status
        </button>
        <span className="text-xs text-amber-900/55">{isPairingLoading ? 'Working…' : 'Ready'}</span>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm font-medium text-emerald-700">{success}</p> : null}
    </HiveAuthLayout>
  )
}

export default PairingScreen
