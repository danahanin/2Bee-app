import { useState } from 'react'
import { Link } from 'react-router-dom'
import EditProfileForm from '../components/profile/EditProfileForm.jsx'
import { useProfile } from '../hooks/useProfile.js'

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-slate-100" />
      <div className="mx-auto h-6 w-48 animate-pulse rounded bg-slate-100" />
      <div className="mx-auto h-4 w-56 animate-pulse rounded bg-slate-100" />
      <div className="mx-auto h-8 w-36 animate-pulse rounded-full bg-slate-100" />
    </div>
  )
}

function StatusToast({ message }) {
  if (!message) return null
  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
        message.type === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {message.text}
    </div>
  )
}

function ProfilePage() {
  const { profile, loading, updating, error, updateProfile } = useProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'U'
  const paired = Boolean(profile.pairId)

  async function handleSaveProfile(payload) {
    const result = await updateProfile(payload)
    if (!result.ok) {
      setStatusMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
      return
    }

    setStatusMessage({ type: 'success', text: 'Profile updated' })
    setIsEditing(false)
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-lg">
        <header className="mb-6 flex items-center gap-3">
          <Link to="/app" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            &larr; Back
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">2Bee</p>
        </header>

        <StatusToast message={statusMessage} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? <ProfileSkeleton /> : null}

          {!loading && error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              Failed to load profile. Try again.
            </div>
          ) : null}

          {!loading && !error ? (
            <>
              {!isEditing ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
                    {initials}
                  </div>

                  <div className="text-center">
                    <h1 className="text-2xl font-semibold text-slate-900">
                      {profile.firstName} {profile.lastName}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      paired ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {paired ? 'Paired' : 'Not paired'}
                  </span>
                </div>
              ) : (
                <EditProfileForm
                  profile={profile}
                  isSaving={updating}
                  onCancel={() => setIsEditing(false)}
                  onSave={handleSaveProfile}
                />
              )}

              <div className="mt-6 flex flex-col gap-3">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Edit Profile
                  </button>
                ) : null}

                <Link
                  to="/app/settings"
                  className="block w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-center text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  Go to Settings
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
