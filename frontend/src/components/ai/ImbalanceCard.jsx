const SEVERITY_CONFIG = {
  high: { label: 'High', classes: 'bg-rose-50 text-rose-700' },
  medium: { label: 'Medium', classes: 'bg-amber-50 text-amber-700' },
  low: { label: 'Low', classes: 'bg-slate-50 text-slate-600' },
}

const TREND_LABEL = {
  increasing: 'Gap is widening',
  stable: 'Gap is steady',
  decreasing: 'Gap is narrowing',
}

function formatPercent(delta) {
  const value = Number(delta) || 0
  return `${Math.round(value * 100)}%`
}

function ImbalanceCard({ imbalance, isLoading }) {
  if (isLoading) {
    return <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
  }

  if (!imbalance) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">No contribution data available yet.</p>
      </div>
    )
  }

  if (!imbalance.isImbalanced) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg">✅</span>
          <div>
            <h4 className="font-semibold text-emerald-800">Contributions are balanced</h4>
            <p className="mt-1 text-sm text-emerald-700">
              {imbalance.message || 'You and your partner are contributing evenly.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const severity = SEVERITY_CONFIG[imbalance.severity] || SEVERITY_CONFIG.low

  return (
    <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-lg">⚖️</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-900">Contribution imbalance</h4>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${severity.classes}`}>
              {severity.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{imbalance.message}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span>Gap: {formatPercent(imbalance.delta)}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{TREND_LABEL[imbalance.trend] || imbalance.trend}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImbalanceCard
