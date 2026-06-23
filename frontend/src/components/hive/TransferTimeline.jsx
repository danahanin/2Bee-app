import UserAvatar from '../design-system/UserAvatar.jsx'

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  failed: 'bg-rose-50 text-rose-700 ring-rose-100',
  cancelled: 'bg-slate-100 text-slate-700 ring-slate-200',
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
  if (transfer.initiatedByUserId === currentUserId || transfer.fromUserId === currentUserId) {
    return 'You started a transfer'
  }
  return `${transfer.fromName || 'Partner'} started a transfer`
}

function TransferTimeline({ transfers, isLoading, error, currentUserId }) {
  if (isLoading) {
    return <div className="h-44 animate-pulse rounded-2xl bg-[var(--honey-50)]" />
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transfers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgba(61,41,20,0.12)] bg-[var(--honey-50)] p-6 text-sm text-[var(--brown-muted)]">
          No transfers yet.
        </div>
      ) : (
        transfers.map((transfer) => {
          const isYou = transfer.initiatedByUserId === currentUserId || transfer.fromUserId === currentUserId
          const avatarUrl = isYou ? transfer.fromAvatarUrl : transfer.initiatedByAvatarUrl || transfer.fromAvatarUrl
          const name = isYou ? 'You' : transfer.fromName || 'Partner'

          return (
            <article key={transfer._id} className="rounded-xl border border-[rgba(61,41,20,0.08)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    user={{
                      firstName: name,
                      lastName: '',
                      avatarUrl,
                    }}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--brown-text)]">
                      {directionLabel(transfer, currentUserId)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--brown-muted)]">
                      {new Date(transfer.date).toLocaleDateString('en-IL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {transfer.toName ? ` · To ${transfer.toName}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--brown-text)]">{formatCurrency(transfer.amount)}</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      STATUS_STYLES[transfer.status] || STATUS_STYLES.pending
                    }`}
                  >
                    {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                  </span>
                </div>
              </div>
            </article>
          )
        })
      )}
    </div>
  )
}

export default TransferTimeline
