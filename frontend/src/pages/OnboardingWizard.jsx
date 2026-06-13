import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchPairStatus, generatePairCode, joinPairCode } from '../services/pairService.js'
import { updateProfile } from '../services/profileService.js'

const steps = ['Profile', 'Bank', 'Pair']

function Stepper({ currentStep }) {
  return (
    <div className="hive-onboarding-stepper">
      {steps.map((step, index) => {
        const isActive = currentStep === index
        const isDone = currentStep > index
        return (
          <div
            key={step}
            className={`hive-onboarding-step ${isActive ? 'hive-onboarding-step-active' : ''} ${isDone ? 'hive-onboarding-step-done' : ''}`}
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
    <main className="hive-onboarding-page">
      <div className="hive-onboarding-shell space-y-6">
        <header className="hive-onboarding-header">
          <div>
            <p className="hive-onboarding-brand">2BEE · The Hive</p>
            <h1 className="hive-onboarding-title">Set up your hive</h1>
            <p className="hive-onboarding-sub">Welcome, {displayName}. Finish setup to enter the app.</p>
          </div>
          <button type="button" onClick={logout} className="hive-onboarding-logout">
            Log out
          </button>
        </header>

        <Stepper currentStep={step} />

        <section className="hive-onboarding-panel">
          {step === 0 ? (
            <form className="space-y-4" onSubmit={handleProfileSubmit}>
              <div>
                <h2>Profile basics</h2>
                <p>These details personalize your account and shared views.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="hive-auth-label">First name</span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="hive-onboarding-input"
                    required
                  />
                </label>
                <label className="block">
                  <span className="hive-auth-label">Last name</span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="hive-onboarding-input"
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className="hive-auth-label">Short bio</span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={200}
                  rows={3}
                  className="hive-onboarding-input resize-none"
                  placeholder="Optional"
                />
              </label>
              <button type="submit" disabled={isLoading} className="hive-onboarding-btn disabled:cursor-not-allowed disabled:opacity-70">
                Continue
              </button>
            </form>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h2>Bank connection</h2>
                <p>Bank sync is not active yet. This step reserves the connection point for the next finance integration.</p>
              </div>
              <div className="hive-onboarding-subpanel border-dashed">
                <p className="text-sm font-semibold text-amber-950">Manual mode enabled</p>
                <p className="mt-2 text-sm text-amber-900/75">You can add expenses manually after pairing.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep(0)} className="hive-onboarding-btn hive-onboarding-btn-secondary">
                  Back
                </button>
                <button type="button" onClick={() => setStep(2)} className="hive-onboarding-btn">
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <h2>Connect your partner</h2>
                <p>Generate a code for your partner or join with their code.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="hive-onboarding-subpanel">
                  <h3 className="font-bold text-amber-950">Invite partner</h3>
                  <p className="mt-1 text-sm text-amber-900/75">Create a one-time code they can enter during onboarding.</p>
                  {generatedCode ? (
                    <div className="hive-onboarding-code">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-800">Pair code</p>
                      <p className="hive-onboarding-code-value">{generatedCode}</p>
                      {generatedExpiresAt ? (
                        <p className="mt-2 text-xs text-amber-800/75">
                          Expires {new Date(generatedExpiresAt).toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={isLoading}
                    className="mt-4 w-full hive-onboarding-btn disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {generatedCode ? 'Regenerate code' : 'Generate code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckStatus}
                    disabled={isLoading}
                    className="mt-3 w-full hive-onboarding-btn hive-onboarding-btn-secondary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Check status
                  </button>
                </div>

                <form className="hive-onboarding-subpanel" onSubmit={handleJoinCode}>
                  <h3 className="font-bold text-amber-950">Join partner</h3>
                  <p className="mt-1 text-sm text-amber-900/75">Enter the six-character code from your partner.</p>
                  <label className="mt-4 block">
                    <span className="hive-auth-label">Pair code</span>
                    <input
                      type="text"
                      value={pairCode}
                      onChange={(event) => setPairCode(event.target.value.toUpperCase())}
                      maxLength={6}
                      className="hive-onboarding-input text-center text-xl font-bold tracking-[0.25em]"
                      placeholder="ABC123"
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-4 w-full hive-onboarding-btn disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? 'Connecting…' : 'Join Hive'}
                  </button>
                </form>
              </div>

              <button type="button" onClick={() => setStep(1)} className="hive-onboarding-btn hive-onboarding-btn-secondary">
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
