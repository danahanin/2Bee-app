import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/formatCurrency.js'

function alertCopy(level) {
  if (level === 'critical') {
    return {
      label: 'Budget limit reached',
      border: 'border-rose-200',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      muted: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-800',
    }
  }
  return {
    label: 'Approaching budget limit',
    border: 'border-[var(--honey-300)]',
    bg: 'bg-[var(--honey-50)]',
    text: 'text-[var(--honey-800)]',
    muted: 'text-[var(--brown-muted)]',
    badge: 'bg-[var(--honey-100)] text-[var(--honey-800)]',
  }
}

/**
 * Summary banner for budgets that crossed 80% (warning) or 100% (critical).
 * Returns null when there are no alerted budgets.
 */
function BudgetAlertBanner({ budgetStatus = [] }) {
  const alerts = budgetStatus.filter(
    (item) => item?.alertLevel === 'warning' || item?.alertLevel === 'critical',
  )

  if (!alerts.length) return null

  const hasCritical = alerts.some((item) => item.alertLevel === 'critical')
  const style = alertCopy(hasCritical ? 'critical' : 'warning')

  return (
    <section
      className={`rounded-2xl border ${style.border} ${style.bg} p-4`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
            {style.label}
          </p>
          <ul className="space-y-1.5">
            {alerts.map((item) => (
              <li key={item.id} className={`text-sm ${style.muted}`}>
                <span className="font-semibold capitalize text-[var(--brown-text)]">
                  {item.category}
                </span>
                {' · '}
                {item.percentUsed}% used ({formatCurrency(item.spent)} / {formatCurrency(item.limit)})
                <span
                  className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item.alertLevel === 'critical'
                      ? alertCopy('critical').badge
                      : alertCopy('warning').badge
                  }`}
                >
                  {item.alertLevel}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Link
          to="/app/assistant"
          className="shrink-0 text-xs font-semibold text-[var(--honey-700)] hover:underline"
        >
          Get tips
        </Link>
      </div>
    </section>
  )
}

export default BudgetAlertBanner
