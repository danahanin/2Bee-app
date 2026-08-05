import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { confirmBankConnection, connectBank, getProfile, updateProfile } from '../services/profileService.js'

const steps = ['Profile', 'Bank', 'Pair']
const PAIR_POLL_MS = 3000
const STEP_STORAGE_KEY = 'twobee_onboarding_step'

function readStoredStep(userId) {
  if (!userId || typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(`${STEP_STORAGE_KEY}_${userId}`)
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 2 ? parsed : 0
}

function writeStoredStep(userId, step) {
  if (!userId || typeof window === 'undefined') return
  window.localStorage.setItem(`${STEP_STORAGE_KEY}_${userId}`, String(step))
}

function Stepper({ currentStep }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => {
        const isActive = currentStep === index
        const isDone = currentStep > index
        return (
          <div
            key={step}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              isActive
                ? 'border-[var(--honey-300)] bg-[var(--honey-50)] text-[var(--honey-800)]'
                : isDone
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs shadow-sm">
              {index + 1}
            </span>
            {step}
          </div>
        )
      })}
    </div>
  )
}

function OnboardingWizard() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    currentUser,
    token,
    logout,
    pairingStatus,
    generatePairCode,
    joinPairCode,
    refreshPairingStatus,
  } = useAuth()
  const [step, setStep] = useState(() => readStoredStep(currentUser?.id))
  const [firstName, setFirstName] = useState(currentUser?.firstName || '')
  const [lastName, setLastName] = useState(currentUser?.lastName || '')
  const [bio, setBio] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState(null)
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(location.state?.statusError || '')
  const [error, setError] = useState('')
  const [bankConnected, setBankConnected] = useState(false)

  // Keep the wizard step durable across full-page redirects (e.g. returning
  // from the Open Finance bank connect flow), which remount the whole app.
  useEffect(() => {
    writeStoredStep(currentUser?.id, step)
  }, [currentUser?.id, step])

  // Hydrate bank connection state from the server, and handle the redirect
  // back from Open Finance's connect journey (it appends status/connection
  // query params to our redirectUrl instead of preserving in-memory state).
  useEffect(() => {
    let mounted = true

    async function hydrate() {
      const params = new URLSearchParams(location.search)
      const connectionId = params.get('connectionId') || params.get('connection_id')
      const bankStatus = params.get('status') || params.get('paymentStatus')
      const isReturningFromBank = Boolean(connectionId || bankStatus)

      if (isReturningFromBank) {
        try {
          const result = await confirmBankConnection(token, { connectionId, status: bankStatus })
          if (!mounted) return
          setBankConnected(Boolean(result.connected))
          setStep(result.connected ? 2 : 1)
          setMessage(
            result.connected
              ? 'Bank account connected. Transactions will sync automatically.'
              : 'Bank connection was not completed. You can try again or skip for now.',
          )
        } catch (confirmError) {
          if (!mounted) return
          setError(confirmError.message || 'Unable to confirm bank connection')
          setStep(1)
        } finally {
          navigate('/onboarding', { replace: true })
        }
        return
      }

      try {
        const profile = await getProfile(token)
        if (!mounted) return
        if (profile.bankAccount?.connected) {
          setBankConnected(true)
        }
      } catch {
        // Non-fatal — onboarding can proceed without a hydrated profile.
      }
    }

    hydrate()
    return () => {
      mounted = false
    }
    // Intentionally run once on mount to process the redirect-back only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayName = useMemo(() => {
    const name = `${firstName} ${lastName}`.trim()
    return name || currentUser?.email || 'there'
  }, [currentUser?.email, firstName, lastName])

  // Keep local invite UI in sync with Auth pairing state.
  useEffect(() => {
    if (pairingStatus?.code) {
      setGeneratedCode(pairingStatus.code)
      setGeneratedExpiresAt(pairingStatus.codeExpiresAt)
    }
  }, [pairingStatus?.code, pairingStatus?.codeExpiresAt])

  // Once Auth knows we are paired, leave onboarding (ProtectedRoute also enforces this).
  useEffect(() => {
    if (pairingStatus?.paired) {
      if (currentUser?.id) {
        window.localStorage.removeItem(`${STEP_STORAGE_KEY}_${currentUser.id}`)
      }
      navigate('/app', { replace: true })
    }
  }, [currentUser?.id, navigate, pairingStatus?.paired])

  useEffect(() => {
    let mounted = true

    async function loadStatus() {
      const result = await refreshPairingStatus()
      if (!mounted) return
      if (!result.ok) {
        setMessage(result.message || 'Pairing status is not available yet.')
        return
      }
      if (result.status?.code) {
        setGeneratedCode(result.status.code)
        setGeneratedExpiresAt(result.status.codeExpiresAt)
        setStep(2)
      }
    }

    loadStatus()
    return () => {
      mounted = false
    }
  }, [refreshPairingStatus])

  // Poll while waiting for a partner after generating a code.
  useEffect(() => {
    if (step !== 2 || !generatedCode || pairingStatus?.paired) return undefined

    const handle = window.setInterval(() => {
      refreshPairingStatus()
    }, PAIR_POLL_MS)

    return () => window.clearInterval(handle)
  }, [generatedCode, pairingStatus?.paired, refreshPairingStatus, step])

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      await updateProfile(token, { firstName, lastName, bio })
      setStep(1)
    } catch (submitError) {
      setError(submitError.message || 'Unable to save profile basics')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConnectBank() {
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      const result = await connectBank(token, `${window.location.origin}/onboarding`)
      if (!result.connectUrl) {
        throw new Error('Bank provider did not return a connect URL')
      }
      window.location.href = result.connectUrl
    } catch (connectError) {
      setError(connectError.message || 'Unable to connect bank account')
      setIsLoading(false)
    }
  }

  async function handleGenerateCode() {
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      const result = await generatePairCode()
      if (!result.ok) {
        throw new Error(result.message || 'Unable to generate pair code')
      }
      setGeneratedCode(result.code)
      setGeneratedExpiresAt(result.expiresAt)
      setMessage('Share this code with your partner. Waiting for them to join…')
    } catch (generateError) {
      setError(generateError.message || 'Unable to generate pair code')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleJoinCode(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      const result = await joinPairCode(pairCode)
      if (!result.ok) {
        throw new Error(result.message || 'Unable to join pair code')
      }
      setMessage('Pairing successful. Redirecting…')
      // AuthContext is now paired; effect + ProtectedRoute navigate to /app.
    } catch (joinError) {
      setError(joinError.message || 'Unable to join pair code')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCheckStatus() {
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      const result = await refreshPairingStatus()
      if (!result.ok) {
        throw new Error(result.message || 'Unable to check pairing status')
      }
      if (result.status?.paired) {
        setMessage('Partner joined. Redirecting…')
      } else {
        setMessage('Still waiting for a partner to join this Hive.')
      }
    } catch (statusError) {
      setError(statusError.message || 'Unable to check pairing status')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="hive-eyebrow">2bee</p>
            <h1 className="text-2xl font-semibold text-slate-900">Set up your Hive</h1>
            <p className="mt-1 text-sm text-slate-600">Welcome, {displayName}. Finish setup to enter the app.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Log out
          </button>
        </header>

        <Stepper currentStep={step} />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 0 ? (
            <form className="space-y-4" onSubmit={handleProfileSubmit}>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Profile basics</h2>
                <p className="mt-1 text-sm text-slate-600">These details personalize your account and shared views.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">First name</span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Last name</span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Short bio</span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Optional"
                />
              </label>
              <button
                type="submit"
                disabled={isLoading}
                className="hive-btn-primary rounded-xl px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
              >
                Continue
              </button>
            </form>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Bank connection</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Connect your bank via Open Finance to sync transactions automatically, or skip and add expenses manually.
                </p>
              </div>
              {bankConnected ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                  <p className="text-sm font-semibold text-emerald-700">Bank account connected</p>
                  <p className="mt-2 text-sm text-emerald-700">Transactions will sync automatically once available.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-slate-700">Open Finance</p>
                  <p className="mt-2 text-sm text-slate-600">
                    You will be redirected to your bank to authorize a secure read-only connection.
                  </p>
                  <button
                    type="button"
                    onClick={handleConnectBank}
                    disabled={isLoading}
                    className="mt-4 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                  >
                    {isLoading ? 'Connecting...' : 'Connect bank account'}
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="hive-btn-primary rounded-xl px-5 py-3 text-sm"
                >
                  {bankConnected ? 'Continue' : 'Skip for now'}
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Connect your partner</h2>
                <p className="mt-1 text-sm text-slate-600">Generate a code for your partner or join with their code.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">Invite partner</h3>
                  <p className="mt-1 text-sm text-slate-600">Create a one-time code they can enter during onboarding.</p>
                  {generatedCode ? (
                    <div className="mt-4 rounded-xl bg-indigo-50 p-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Pair code</p>
                      <p className="mt-2 text-3xl font-bold tracking-[0.25em] text-indigo-900">{generatedCode}</p>
                      {generatedExpiresAt ? (
                        <p className="mt-2 text-xs text-indigo-700">
                          Expires {new Date(generatedExpiresAt).toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-indigo-600">Waiting for partner… status refreshes automatically.</p>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={isLoading}
                    className="mt-4 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {generatedCode ? 'Regenerate code' : 'Generate code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckStatus}
                    disabled={isLoading}
                    className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Check status
                  </button>
                </div>

                <form className="rounded-2xl border border-slate-200 p-4" onSubmit={handleJoinCode}>
                  <h3 className="font-semibold text-slate-900">Join partner</h3>
                  <p className="mt-1 text-sm text-slate-600">Enter the six-character code from your partner.</p>
                  <label className="mt-4 block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Pair code</span>
                    <input
                      type="text"
                      value={pairCode}
                      onChange={(event) => setPairCode(event.target.value.toUpperCase())}
                      maxLength={6}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-bold tracking-[0.25em] text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="ABC123"
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="hive-btn-primary mt-4 w-full rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? 'Connecting...' : 'Join Hive'}
                  </button>
                </form>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </button>
            </div>
          ) : null}

          {error ? <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
          {message ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{message}</p> : null}
        </section>
      </div>
    </main>
  )
}

export default OnboardingWizard
