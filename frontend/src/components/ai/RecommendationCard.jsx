import HivePanel from '../hive/primitives/HivePanel.jsx'
import HiveButton from '../hive/primitives/HiveButton.jsx'

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

const PRIORITY_CONFIG = {
  1: { label: 'High', classes: 'hive-badge-rose' },
  2: { label: 'Medium', classes: 'hive-badge-amber' },
  3: { label: 'Low', classes: 'hive-badge-muted' },
}

function RecommendationCard({ recommendation, onAction }) {
  const priorityConfig = PRIORITY_CONFIG[recommendation.priority] || PRIORITY_CONFIG[3]

  return (
    <HivePanel className="p-4 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-[var(--chamber-accent-dark)]">{recommendation.title}</h4>
            <span className={`hive-badge ${priorityConfig.classes}`}>{priorityConfig.label}</span>
          </div>
          <p className="mt-1 text-sm opacity-80">{recommendation.description}</p>
          {recommendation.category && <p className="mt-1 text-xs opacity-60">Category: {recommendation.category}</p>}
        </div>
        {recommendation.potentialSavings > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-xs opacity-60">Save up to</p>
            <p className="font-bold text-emerald-700">{formatCurrency(recommendation.potentialSavings)}</p>
          </div>
        )}
      </div>
      {recommendation.cta && onAction && (
        <HiveButton type="button" onClick={() => onAction(recommendation)} className="mt-3 w-full">
          {recommendation.cta}
        </HiveButton>
      )}
    </HivePanel>
  )
}

export default RecommendationCard
