import { useState } from 'react'
import { Link } from 'react-router-dom'
import NotificationSettings from '../components/settings/NotificationSettings.jsx'
import PairingManagement from '../components/settings/PairingManagement.jsx'
import PrivacySettings from '../components/settings/PrivacySettings.jsx'
import SharedCategoriesSettings from '../components/settings/SharedCategoriesSettings.jsx'
import BankAccountCard from '../components/settings/BankAccountCard.jsx'
import HiveLayout from '../components/hive/HiveLayout.jsx'
import HivePanel from '../components/hive/primitives/HivePanel.jsx'
import { AVAILABLE_CATEGORIES, useSettings } from '../hooks/useSettings.js'
import { useProfile } from '../hooks/useProfile.js'
import { usePartnerProfile } from '../hooks/usePartnerProfile.js'

function CollapsibleCard({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <HivePanel className="overflow-hidden p-0">
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="hive-collapsible-trigger">
        <span className="flex items-center gap-2">
          {icon ? <span>{icon}</span> : null}
          <span className="hive-panel-title text-sm">{title}</span>
        </span>
        <span className="text-xs font-bold opacity-60">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? <div className="hive-collapsible-body">{children}</div> : null}
    </HivePanel>
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

function SettingsPage() {
  const { profile } = useProfile()
  const { partner } = usePartnerProfile()
  const {
    privacySettings, updatePrivacySettings,
    notificationSettings, updateNotificationSettings,
    sharedCategories, updateSharedCategories,
    disconnectPair, bankAccount, disconnectBankAccount,
    pairing, loading, error,
    savingPrivacy, savingNotifications, savingSharedCategories,
    disconnectingPair, disconnectingBank,
  } = useSettings()

  const [statusMessage, setStatusMessage] = useState(null)

  async function handlePrivacyToggle(field, value) {
    const result = await updatePrivacySettings({ [field]: value })
    if (!result.ok) setStatusMessage({ type: 'error', text: result.message || 'Failed to update privacy settings.' })
  }

  async function handleNotificationToggle(field, value) {
    const result = await updateNotificationSettings({ [field]: value })
    if (!result.ok) setStatusMessage({ type: 'error', text: result.message || 'Failed to update notification settings.' })
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
    <HiveLayout title="Guard Cell" subtitle="Privacy, pairing & preferences" chamberName="Guard Cell" theme="settings" profile={profile} partner={partner}>
      <StatusToast message={statusMessage} />
      {error ? <div className="hive-alert hive-alert-error mb-4">{error}</div> : null}

      <div className="flex flex-col gap-3">
        <CollapsibleCard title="Account" icon="👤">
          <p className="hive-panel-sub">Manage your bee portrait.</p>
          <Link to="/app/profile" className="hive-btn hive-btn-primary mt-3 inline-block no-underline">Open portrait</Link>
        </CollapsibleCard>

        <CollapsibleCard title="Privacy" icon="🔒">
          <PrivacySettings settings={privacySettings} loading={loading} savingMap={savingPrivacy} onToggle={handlePrivacyToggle} />
        </CollapsibleCard>

        <CollapsibleCard title="Notifications" icon="🔔">
          <NotificationSettings settings={notificationSettings} loading={loading} savingMap={savingNotifications} onToggle={handleNotificationToggle} />
        </CollapsibleCard>

        <CollapsibleCard title="Shared Categories" icon="🍯">
          <SharedCategoriesSettings availableCategories={AVAILABLE_CATEGORIES} selectedCategories={sharedCategories} loading={loading} isSaving={savingSharedCategories} onSave={handleSaveCategories} />
        </CollapsibleCard>

        <CollapsibleCard title="Pairing" icon="🐝">
          <PairingManagement pairing={pairing} isDisconnecting={disconnectingPair} onDisconnect={disconnectPair} onStatusMessage={setStatusMessage} />
        </CollapsibleCard>

        <CollapsibleCard title="Bank account" icon="🏦">
          <BankAccountCard bankAccount={bankAccount} isDisconnecting={disconnectingBank} onDisconnect={handleDisconnectBank} />
        </CollapsibleCard>
      </div>
    </HiveLayout>
  )
}

export default SettingsPage
