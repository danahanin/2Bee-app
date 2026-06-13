import { useState } from 'react'
import { Link } from 'react-router-dom'
import EditProfileForm from '../components/profile/EditProfileForm.jsx'
import Avatar from '../components/profile/Avatar.jsx'
import HiveLayout from '../components/hive/HiveLayout.jsx'
import HivePanel from '../components/hive/primitives/HivePanel.jsx'
import HiveButton from '../components/hive/primitives/HiveButton.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { usePartnerProfile } from '../hooks/usePartnerProfile.js'

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="mx-auto hex-clip h-20 w-20 animate-pulse bg-amber-100" />
      <div className="mx-auto hive-skeleton h-6 w-48" />
      <div className="mx-auto hive-skeleton h-4 w-56" />
    </div>
  )
}

function StatusToast({ message }) {
  if (!message) return null
  return (
    <div className={`hive-alert mb-4 ${message.type === 'error' ? 'hive-alert-error' : 'hive-alert-success'}`}>
      {message.text}
    </div>
  )
}

function ProfilePage() {
  const { profile, loading, updating, error, updateProfile } = useProfile()
  const { partner } = usePartnerProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const paired = Boolean(profile.pairId)

  async function handleSaveProfile(payload) {
    const result = await updateProfile(payload)
    if (!result.ok) {
      setStatusMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
      return
    }
    setStatusMessage({ type: 'success', text: 'Portrait updated!' })
    setIsEditing(false)
  }

  return (
    <HiveLayout title="Your Portrait" subtitle="Avatar, name & bio" chamberName="Portrait Cell" theme="profile" profile={profile} partner={partner}>
      <StatusToast message={statusMessage} />

      <HivePanel className="p-6">
        {loading ? <ProfileSkeleton /> : null}

        {!loading && error ? (
          <div className="hive-alert hive-alert-error">Failed to load profile. Try again.</div>
        ) : null}

        {!loading && !error ? (
          <>
            {!isEditing ? (
              <div className="flex flex-col items-center gap-4">
                <div className="hive-portrait-frame">
                  <Avatar avatarUrl={profile.avatarUrl} firstName={profile.firstName} lastName={profile.lastName} size="xl" />
                </div>
                <div className="text-center">
                  <h2 className="hive-panel-title text-2xl">{profile.firstName} {profile.lastName}</h2>
                  <p className="hive-panel-sub">{profile.email}</p>
                  {profile.bio ? <p className="mt-3 max-w-sm text-sm opacity-80">{profile.bio}</p> : null}
                </div>
                <span className={`hive-badge ${paired ? 'hive-badge-green' : 'hive-badge-amber'}`}>
                  {paired ? '🐝 Paired in the hive' : 'Solo bee — find a mate!'}
                </span>
                {partner ? (
                  <div className="hive-list-item mt-2 flex w-full max-w-sm items-center gap-3">
                    <Avatar avatarUrl={partner.avatarUrl} firstName={partner.firstName} lastName={partner.lastName} size="sm" />
                    <div className="text-left text-sm">
                      <p className="font-semibold text-[var(--chamber-accent-dark)]">{partner.firstName} {partner.lastName}</p>
                      <p className="opacity-70">Your hive mate</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <EditProfileForm profile={profile} isSaving={updating} onCancel={() => setIsEditing(false)} onSave={handleSaveProfile} />
            )}

            <div className="mt-6 flex flex-col gap-3">
              {!isEditing ? (
                <HiveButton type="button" className="w-full" onClick={() => setIsEditing(true)}>
                  Edit portrait
                </HiveButton>
              ) : null}
              <Link to="/app/settings" className="hive-btn hive-btn-secondary w-full text-center no-underline">
                Guard cell (settings)
              </Link>
            </div>
          </>
        ) : null}
      </HivePanel>
    </HiveLayout>
  )
}

export default ProfilePage
