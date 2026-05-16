import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchPairStatus, generatePairCode, joinPairCode } from '../services/pairService.js'
import { updateProfile } from '../services/profileService.js'

const steps = ['Profile', 'Bank', 'Pair']

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
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
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
  const { currentUser, token, logout } = useAuth()
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState(currentUser?.firstName || '')
  const [lastName, setLastName] = useState(currentUser?.lastName || '')
  const [bio, setBio] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState(null)
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(location.state?.statusError || '')
  const [error, setError] = useState('')

  const displayName = useMemo(() => {
    const name = `${firstName} ${lastName}`.trim()
    return name || currentUser?.email || 'there'
  }, [currentUser?.email, firstName, lastName])

  useEffect(() => {
    let mounted = true

    async function loadStatus() {
      try {
        const status = await fetchPairStatus(token)
        if (!mounted) return
        if (status.hiveId) {
          window.localStorage.setItem('twobee_hive_id', status.hiveId)
        }
        if (status.paired) {
          navigate('/app', { replace: true })
        } else if (status.code) {
          setGeneratedCode(status.code)
          setGeneratedExpiresAt(status.codeExpiresAt)
        }
      } catch (loadError) {
        if (!mounted) return
        setMessage(loadError.message || 'Pairing status is not available yet.')
      }
    }

    loadStatus()
    return () => {
      mounted = false
    }
  }, [navigate, token])

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

  async function handleGenerateCode() {
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      const result = await generatePairCode(token)
      setGeneratedCode(result.code)
      setGeneratedExpiresAt(result.expiresAt)
      setMessage('Share this code with your partner. When they join, check status to continue.')
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
      const result = await joinPairCode(token, pairCode)
      if (result.hiveId) {
        window.localStorage.setItem('twobee_hive_id', result.hiveId)
      }
      navigate('/app', { replace: true })
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
      const status = await fetchPairStatus(token)
      if (status.hiveId) {
        window.localStorage.setItem('twobee_hive_id', status.hiveId)
      }
      if (status.paired) {
        navigate('/app', { replace: true })
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">2Bee</p>
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
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? 'Saving...' : 'Continue'}
              </button>
            </form>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Bank connection</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Bank sync is not active yet. This step reserves the connection point for the next finance integration.
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-700">Manual mode enabled</p>
                <p className="mt-2 text-sm text-slate-600">You can add expenses manually after pairing.</p>
              </div>
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
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Continue
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
                    className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
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
