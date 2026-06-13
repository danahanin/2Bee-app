import HivePanel from './primitives/HivePanel.jsx'
import HiveEmptyState from './primitives/HiveEmptyState.jsx'

const STATUS_STYLES = {
  pending: 'hive-badge-amber',
  completed: 'hive-badge-green',
  failed: 'hive-badge-rose',
  cancelled: 'hive-badge-muted',
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function directionLabel(transfer, currentUserId) {
  if (transfer.fromUserId === currentUserId) {
    return 'You started a transfer'
  }
  return 'Your partner started a transfer'
}

function TransferTimeline({ transfers, isLoading, error, currentUserId }) {
  if (isLoading) {
    return <div className="hive-skeleton h-44" />
  }

  if (error) {
    return <div className="hive-alert hive-alert-error">{error}</div>
  }

  return (
    <HivePanel className="p-5">
      <div className="mb-4">
        <p className="hive-panel-eyebrow">Transfer history</p>
        <h3 className="hive-panel-title">Recent hive transfers</h3>
      </div>

      {transfers.length === 0 ? (
        <HiveEmptyState message="No transfers yet — when one starts, it shows up here." icon="💸" />
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer) => (
            <article key={transfer._id} className="hive-list-item">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--chamber-accent-dark)]">{directionLabel(transfer, currentUserId)}</p>
                  <p className="mt-1 text-sm opacity-75">
                    {new Date(transfer.date).toLocaleDateString('en-IL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' · '}
                    {transfer.providerId}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-[var(--chamber-accent-dark)]">{formatCurrency(transfer.amount)}</p>
                  <span className={`hive-badge mt-1 ${STATUS_STYLES[transfer.status] || STATUS_STYLES.pending}`}>
                    {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm opacity-70">
                {transfer.providerMessage ||
                  (transfer.status === 'pending'
                    ? 'Waiting for the bank to confirm this transfer.'
                    : 'Status synced from Open Finance.')}
              </p>
            </article>
          ))}
        </div>
      )}
    </HivePanel>
  )
}

export default TransferTimeline
