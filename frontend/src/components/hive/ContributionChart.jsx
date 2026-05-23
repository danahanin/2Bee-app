function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function widthPercent(value, max) {
  if (!max) return '0%'
  return `${Math.max(8, Math.round((value / max) * 100))}%`
}

function ContributionChart({ balance, currentUserId }) {
  if (!balance?.contributions?.length) return null

  const maxPaid = Math.max(...balance.contributions.map((item) => item.paid), balance.equalShare)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contribution view</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Who has covered more so far</h3>
      </div>

      <div className="space-y-4">
        {balance.contributions.map((item) => {
          const isCurrentUser = item.userId === currentUserId
          return (
            <div key={item.userId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{isCurrentUser ? 'You' : 'Your partner'}</span>
                <span className="text-slate-500">
                  Paid {formatCurrency(item.paid)} • Remaining {formatCurrency(Math.abs(item.remainingNet))}
                </span>
              </div>

              <div className="space-y-2">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${isCurrentUser ? 'bg-indigo-600' : 'bg-violet-400'}`}
                    style={{ width: widthPercent(item.paid, maxPaid) }}
                  />
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: widthPercent(balance.equalShare, maxPaid) }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
          Paid so far
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Even split target
        </span>
      </div>
    </section>
  )
}

export default ContributionChart
