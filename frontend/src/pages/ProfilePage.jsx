import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import EditProfileForm from '../components/profile/EditProfileForm.jsx'
import NotificationSettings from '../components/settings/NotificationSettings.jsx'
import PairingManagement from '../components/settings/PairingManagement.jsx'
import PrivacySettings from '../components/settings/PrivacySettings.jsx'
import SharedCategoriesSettings from '../components/settings/SharedCategoriesSettings.jsx'
import BankAccountCard from '../components/settings/BankAccountCard.jsx'
import HiveCard from '../components/design-system/HiveCard.jsx'
import HivePanel from '../components/design-system/HivePanel.jsx'
import HexButton from '../components/design-system/HexButton.jsx'
import UserAvatar from '../components/design-system/UserAvatar.jsx'
import AvatarPickerModal from '../components/profile/AvatarPickerModal.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { AVAILABLE_CATEGORIES, useSettings } from '../hooks/useSettings.js'
import { useHiveBalance } from '../hooks/useHive.js'

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
  const { logout, pairingStatus } = useAuth()
  const [searchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const defaultSection = sectionParam === 'settings' ? 'notifications' : sectionParam || 'account'
  const [openSection, setOpenSection] = useState(defaultSection)
  const { profile, loading, updating, error, updateProfile, refetch } = useProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  const hiveId = pairingStatus?.hiveId || localStorage.getItem('twobee_hive_id') || ''
  const { balance } = useHiveBalance(hiveId)

  const {
    privacySettings,
    updatePrivacySettings,
    notificationSettings,
    updateNotificationSettings,
    sharedCategories,
    updateSharedCategories,
    disconnectPair,
    bankAccount,
    disconnectBankAccount,
    pairing,
    loading: settingsLoading,
    savingPrivacy,
    savingNotifications,
    savingSharedCategories,
    disconnectingPair,
    disconnectingBank,
  } = useSettings()

  useEffect(() => {
    if (searchParams.get('section')) {
      setOpenSection(searchParams.get('section'))
    }
  }, [searchParams])

  const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'U'
  const paired = Boolean(profile.pairId)
  const partner = balance?.participants?.find((p) => !p.isCurrentUser)

  async function handleSaveProfile(payload) {
    const result = await updateProfile(payload)
    if (!result.ok) {
      setStatusMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
      return
    }
    setStatusMessage({ type: 'success', text: 'Profile updated' })
    setIsEditing(false)
  }

  async function handlePrivacyToggle(field, value) {
    const result = await updatePrivacySettings({ [field]: value })
    if (!result.ok) setStatusMessage({ type: 'error', text: result.message || 'Failed to update privacy.' })
  }

  async function handleNotificationToggle(field, value) {
    const result = await updateNotificationSettings({ [field]: value })
    if (!result.ok) setStatusMessage({ type: 'error', text: result.message || 'Failed to update notifications.' })
  }

  async function handleSaveCategories(nextCategories) {
    const result = await updateSharedCategories(nextCategories)
    if (!result.ok) {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to update categories.' })
      return { ok: false }
    }
    setStatusMessage({ type: 'success', text: 'Shared categories saved.' })
    return { ok: true }
  }

  async function handleDisconnectBank() {
    const result = await disconnectBankAccount()
    if (!result.ok) {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to disconnect bank.' })
      return
    }
    setStatusMessage({ type: 'success', text: 'Bank account disconnected.' })
  }

  const sections = [
    { id: 'account', label: 'Account' },
    { id: 'partner', label: 'Partner' },
    { id: 'payment', label: 'Payment' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'categories', label: 'Categories' },
    { id: 'pairing', label: 'Pairing' },
    { id: 'security', label: 'Security' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <header>
        <p className="hive-eyebrow">Profile</p>
        <h1 className="hive-title text-xl sm:text-2xl md:text-3xl">Account settings</h1>
      </header>

      <StatusToast message={statusMessage} />

      <HiveCard className="flex flex-col items-center gap-4 px-4 py-6 sm:py-8">
        {loading ? (
          <div className="h-20 w-20 animate-pulse rounded-full bg-[var(--honey-100)]" />
        ) : (
          <>
            <UserAvatar user={profile} size="xl" />
            <div className="text-center">
              <h2 className="text-xl font-semibold text-[var(--brown-text)]">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="break-all text-sm text-[var(--brown-muted)]">{profile.email}</p>
              {profile.bio ? <p className="mt-2 text-sm text-[var(--brown-muted)]">{profile.bio}</p> : null}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                paired ? 'bg-emerald-100 text-emerald-800' : 'bg-[var(--honey-100)] text-[var(--brown-muted)]'
              }`}
            >
              {paired ? 'Paired' : 'Not paired'}
            </span>
            {!isEditing ? (
              <div className="flex w-full max-w-sm flex-col gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="hive-btn-primary min-h-11 rounded-xl px-4 py-2 text-sm"
                >
                  Change photo
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="min-h-11 rounded-xl border border-[rgba(61,41,20,0.12)] px-4 py-2 text-sm font-semibold text-[var(--brown-text)] hover:bg-[var(--honey-50)]"
                >
                  Edit profile
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md">
                <EditProfileForm
                  profile={profile}
                  isSaving={updating}
                  onCancel={() => setIsEditing(false)}
                  onSave={handleSaveProfile}
                />
              </div>
            )}
          </>
        )}
        {error ? (
          <p className="text-sm text-rose-700">Failed to load profile.</p>
        ) : null}
      </HiveCard>

      <div className="hive-scroll-x gap-2 sm:flex-wrap sm:overflow-visible">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setOpenSection(s.id)}
            className={`min-h-10 shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
              openSection === s.id
                ? 'bg-[var(--honey-400)] text-white'
                : 'border border-[rgba(61,41,20,0.1)] bg-white text-[var(--brown-muted)] hover:bg-[var(--honey-50)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {openSection === 'partner' && (
        <HivePanel title="Connected partner" subtitle="Your hive partner">
          {partner ? (
            <div className="flex items-center gap-4">
              <UserAvatar
                user={{
                  firstName: partner.name?.split(' ')[0],
                  lastName: partner.name?.split(' ').slice(1).join(' '),
                  name: partner.name,
                  avatarUrl: partner.avatarUrl,
                }}
                size="lg"
              />
              <div>
                <p className="font-semibold text-[var(--brown-text)]">{partner.name}</p>
                <p className="text-sm text-[var(--brown-muted)]">
                  Paid {partner.paid != null ? `₪${partner.paid}` : '—'} in shared expenses
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--brown-muted)]">No partner connected yet.</p>
          )}
        </HivePanel>
      )}

      {openSection === 'payment' && (
        <HivePanel title="Payment details" subtitle="Bank account for transfers">
          <BankAccountCard
            bankAccount={bankAccount}
            isDisconnecting={disconnectingBank}
            onDisconnect={handleDisconnectBank}
          />
        </HivePanel>
      )}

      {openSection === 'notifications' && (
        <HivePanel title="Notifications" subtitle="Alerts and reminders">
          <NotificationSettings
            settings={notificationSettings}
            loading={settingsLoading}
            savingMap={savingNotifications}
            onToggle={handleNotificationToggle}
          />
        </HivePanel>
      )}

      {openSection === 'privacy' && (
        <HivePanel title="Privacy" subtitle="Control what your partner sees">
          <PrivacySettings
            settings={privacySettings}
            loading={settingsLoading}
            savingMap={savingPrivacy}
            onToggle={handlePrivacyToggle}
          />
        </HivePanel>
      )}

      {openSection === 'categories' && (
        <HivePanel title="Shared categories" subtitle="Categories for hive expenses">
          <SharedCategoriesSettings
            availableCategories={AVAILABLE_CATEGORIES}
            selectedCategories={sharedCategories}
            loading={settingsLoading}
            isSaving={savingSharedCategories}
            onSave={handleSaveCategories}
          />
        </HivePanel>
      )}

      {openSection === 'pairing' && (
        <HivePanel title="Pairing" subtitle="Manage your connection">
          <PairingManagement
            pairing={pairing}
            isDisconnecting={disconnectingPair}
            onDisconnect={disconnectPair}
            onStatusMessage={setStatusMessage}
          />
        </HivePanel>
      )}

      {openSection === 'security' && (
        <HivePanel title="Security" subtitle="Session and account">
          <p className="mb-4 text-sm text-[var(--brown-muted)]">
            Password change will be available in a future update. You can sign out of your current session below.
          </p>
          <HexButton onClick={logout} variant="primary" size="md">
            <span>Log out</span>
          </HexButton>
        </HivePanel>
      )}

      {openSection === 'account' && !isEditing && (
        <HivePanel title="Account" subtitle="Profile information">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-[rgba(61,41,20,0.06)] pb-2">
              <dt className="text-[var(--brown-muted)]">Name</dt>
              <dd className="font-medium text-[var(--brown-text)]">
                {profile.firstName} {profile.lastName}
              </dd>
            </div>
            <div className="flex justify-between border-b border-[rgba(61,41,20,0.06)] pb-2">
              <dt className="text-[var(--brown-muted)]">Email</dt>
              <dd className="font-medium text-[var(--brown-text)]">{profile.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--brown-muted)]">Status</dt>
              <dd className="font-medium text-[var(--brown-text)]">{paired ? 'Paired' : 'Unpaired'}</dd>
            </div>
          </dl>
        </HivePanel>
      )}

      {avatarModalOpen ? (
        <AvatarPickerModal
          user={profile}
          onClose={() => setAvatarModalOpen(false)}
          onSaved={() => {
            refetch()
            setStatusMessage({ type: 'success', text: 'Profile image updated' })
          }}
        />
      ) : null}
    </div>
  )
}

export default ProfilePage
