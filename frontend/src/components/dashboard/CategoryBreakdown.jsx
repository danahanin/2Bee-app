import HivePanel from '../hive/primitives/HivePanel.jsx'
import HiveEmptyState from '../hive/primitives/HiveEmptyState.jsx'
import HoneyJar, { HoneyJarGrid } from '../hive/primitives/HoneyJar.jsx'

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function fillPercent(amount, max) {
  if (!max) return 12
  return Math.max(12, Math.round((amount / max) * 100))
}

function CategoryBreakdown({ title, subtitle, items, emptyMessage }) {
  if (!items?.length) {
    return (
      <HivePanel className="p-5">
        <h2 className="hive-panel-title">{title}</h2>
        {subtitle ? <p className="hive-panel-sub">{subtitle}</p> : null}
        <HiveEmptyState message={emptyMessage} className="mt-3" />
      </HivePanel>
    )
  }

  const max = Math.max(...items.map((item) => item.amount))
  const total = items.reduce((sum, item) => sum + item.amount, 0)

  return (
    <HivePanel className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="hive-panel-title">{title}</h2>
          {subtitle ? <p className="hive-panel-sub">{subtitle}</p> : null}
        </div>
        <p className="text-sm font-semibold text-[var(--chamber-accent-dark)]">{formatCurrency(total)} in the hive</p>
      </div>

      <HoneyJarGrid>
        {items.map((item) => (
          <HoneyJar
            key={item.category}
            size="sm"
            label={item.category}
            value={formatCurrency(item.amount)}
            fillPercent={fillPercent(item.amount, max)}
            icon="🍯"
          />
        ))}
      </HoneyJarGrid>
    </HivePanel>
  )
}

export default CategoryBreakdown
