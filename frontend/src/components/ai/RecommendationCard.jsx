function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

const PRIORITY_CONFIG = {
  1: { label: 'High', classes: 'bg-rose-50 text-rose-700' },
  2: { label: 'Medium', classes: 'bg-amber-50 text-amber-700' },
  3: { label: 'Low', classes: 'bg-slate-50 text-slate-600' },
}

function RecommendationCard({ recommendation, onAction }) {
  const priorityConfig = PRIORITY_CONFIG[recommendation.priority] || PRIORITY_CONFIG[3]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-900">{recommendation.title}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityConfig.classes}`}>
              {priorityConfig.label} Priority
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{recommendation.description}</p>
          {recommendation.category && (
            <p className="mt-1 text-xs text-slate-500">Category: {recommendation.category}</p>
          )}
        </div>
        {recommendation.potentialSavings > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-slate-500">Save up to</p>
            <p className="font-bold text-emerald-600">{formatCurrency(recommendation.potentialSavings)}</p>
          </div>
        )}
      </div>
      {recommendation.cta && onAction && (
        <button
          type="button"
          onClick={() => onAction(recommendation)}
          className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          {recommendation.cta}
        </button>
      )}
    </div>
  )
}

export default RecommendationCard
