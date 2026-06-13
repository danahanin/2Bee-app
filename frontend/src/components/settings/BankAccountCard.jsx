import HiveButton from '../hive/primitives/HiveButton.jsx'

function formatSyncTime(timestamp) {
  if (!timestamp) return 'Unknown'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'
  return parsed.toLocaleString('en-IL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function BankAccountCard({ bankAccount, isDisconnecting, onDisconnect }) {
  const isConnected = Boolean(bankAccount?.connected || bankAccount?.bankName)

  return (
    <section className="space-y-3">
      {isConnected ? (
        <div className="hive-list-item">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg">🏦</span>
            <div>
              <p className="font-semibold text-[var(--chamber-accent-dark)]">{bankAccount.bankName || 'Connected bank'}</p>
              <p className="text-xs opacity-70">Last synced: {formatSyncTime(bankAccount.lastSyncedAt)}</p>
            </div>
          </div>
          <HiveButton type="button" variant="ghost" className="mt-4" onClick={onDisconnect} disabled={isDisconnecting}>
            {isDisconnecting ? 'Disconnecting…' : 'Disconnect bank'}
          </HiveButton>
        </div>
      ) : (
        <div className="hive-empty-state">
          <span className="hive-empty-state-icon">🏦</span>
          <p>No bank connected yet — manual mode works fine!</p>
        </div>
      )}
    </section>
  )
}

export default BankAccountCard
