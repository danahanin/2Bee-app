import { useState } from 'react'
import { Link } from 'react-router-dom'
import NotificationSettings from '../components/settings/NotificationSettings.jsx'
import PairingManagement from '../components/settings/PairingManagement.jsx'
import PrivacySettings from '../components/settings/PrivacySettings.jsx'
import SharedCategoriesSettings from '../components/settings/SharedCategoriesSettings.jsx'
import BankAccountCard from '../components/settings/BankAccountCard.jsx'
import { AVAILABLE_CATEGORIES, useSettings } from '../hooks/useSettings.js'

function CollapsibleCard({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        <span className="text-xs font-semibold text-slate-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? <div className="border-t border-slate-100 px-5 py-4">{children}</div> : null}
    </section>
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

function SettingsPage() {
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
    loading,
    error,
    savingPrivacy,
    savingNotifications,
    savingSharedCategories,
    disconnectingPair,
    disconnectingBank,
  } = useSettings()

  const [statusMessage, setStatusMessage] = useState(null)

  async function handlePrivacyToggle(field, value) {
    const result = await updatePrivacySettings({ [field]: value })
    if (!result.ok) {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to update privacy settings.' })
    }
  }

  async function handleNotificationToggle(field, value) {
    const result = await updateNotificationSettings({ [field]: value })
    if (!result.ok) {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to update notification settings.' })
    }
  }

  async function handleSaveCategories(nextCategories) {
    const result = await updateSharedCategories(nextCategories)
    if (!result.ok) {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to update shared categories.' })
      return { ok: false }
    }

    setStatusMessage({ type: 'success', text: 'Shared categories saved.' })
    return { ok: true }
  }

  async function handleDisconnectBank() {
    const result = await disconnectBankAccount()
    if (!result.ok) {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to disconnect bank account.' })
      return
    }
    setStatusMessage({ type: 'success', text: 'Bank account disconnected.' })
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <Link to="/app/profile" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            &larr; Back
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">2Bee</p>
        </header>

        <h1 className="mb-4 text-2xl font-semibold text-slate-900">Settings</h1>
        <StatusToast message={statusMessage} />

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <CollapsibleCard title="Account">
            <p className="text-sm text-slate-700">Manage your profile information.</p>
            <Link
              to="/app/profile"
              className="mt-3 inline-flex rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              Open profile
            </Link>
          </CollapsibleCard>

          <CollapsibleCard title="Privacy">
            <PrivacySettings
              settings={privacySettings}
              loading={loading}
              savingMap={savingPrivacy}
              onToggle={handlePrivacyToggle}
            />
          </CollapsibleCard>

          <CollapsibleCard title="Notifications">
            <NotificationSettings
              settings={notificationSettings}
              loading={loading}
              savingMap={savingNotifications}
              onToggle={handleNotificationToggle}
            />
          </CollapsibleCard>

          <CollapsibleCard title="Shared Categories">
            <SharedCategoriesSettings
              availableCategories={AVAILABLE_CATEGORIES}
              selectedCategories={sharedCategories}
              loading={loading}
              isSaving={savingSharedCategories}
              onSave={handleSaveCategories}
            />
          </CollapsibleCard>

          <CollapsibleCard title="Pairing">
            <PairingManagement
              pairing={pairing}
              isDisconnecting={disconnectingPair}
              onDisconnect={disconnectPair}
              onStatusMessage={setStatusMessage}
            />
          </CollapsibleCard>

          <CollapsibleCard title="Bank account">
            <BankAccountCard
              bankAccount={bankAccount}
              isDisconnecting={disconnectingBank}
              onDisconnect={handleDisconnectBank}
            />
          </CollapsibleCard>
        </div>
      </div>
    </main>
  )
}

export default SettingsPage
