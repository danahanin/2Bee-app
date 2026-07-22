import { useState } from 'react'

const TYPE_STYLES = {
  budget_warning: 'border-amber-200 bg-amber-50 text-amber-900',
  spike: 'border-rose-200 bg-rose-50 text-rose-900',
  forecast_exceeded: 'border-orange-200 bg-orange-50 text-orange-900',
  overspend: 'border-amber-200 bg-amber-50 text-amber-900',
  imbalance: 'border-[var(--honey-300)] bg-[var(--honey-100)] text-[var(--honey-900)]',
}

function AIAlertsStrip({ alerts, isLoading }) {
  const [dismissed, setDismissed] = useState(new Set())

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-xl bg-[var(--honey-50)]" />
  }

  const visible = (alerts || []).filter((alert) => !dismissed.has(alert.id))

  if (!visible.length) {
    return (
      <div className="rounded-xl border border-[rgba(61,41,20,0.08)] bg-white px-4 py-3 text-sm text-[var(--brown-muted)]">
        No active alerts — your hive looks healthy.
      </div>
    )
  }

  return (
    <div className="hive-scroll-x sm:flex sm:flex-wrap sm:overflow-visible">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={`w-[min(85vw,20rem)] shrink-0 rounded-xl border px-4 py-3 sm:w-auto sm:min-w-[240px] sm:max-w-sm ${TYPE_STYLES[alert.type] || 'border-slate-200 bg-white text-slate-800'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs opacity-90">{alert.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base opacity-60 hover:bg-black/5 hover:opacity-100"
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default AIAlertsStrip
