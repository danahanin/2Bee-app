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
  if (transfer.fromUserId === currentUserId) {
    return 'You started a transfer'
  }
  return 'Your partner started a transfer'
}

function TransferTimeline({ transfers, isLoading, error, currentUserId }) {
  if (isLoading) {
    return <div className="h-44 animate-pulse rounded-2xl bg-white shadow-sm" />
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Transfer history</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Recent hive transfers</h3>
      </div>

      {transfers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No transfers yet. Once one starts, it will show up here with a live status.
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer) => (
            <article key={transfer._id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{directionLabel(transfer, currentUserId)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(transfer.date).toLocaleDateString('en-IL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' • '}
                    Provider: {transfer.providerId}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(transfer.amount)}</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      STATUS_STYLES[transfer.status] || STATUS_STYLES.pending
                    }`}
                  >
                    {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                  </span>
                </div>
              </div>

              {transfer.providerMessage ? (
                <p className="mt-3 text-sm text-slate-500">{transfer.providerMessage}</p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {transfer.status === 'pending'
                    ? 'We are still waiting for the bank to confirm this transfer.'
                    : 'This transfer status was synced from Open Finance.'}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default TransferTimeline
