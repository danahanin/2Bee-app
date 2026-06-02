const TYPE_CONFIG = {
  overspend: { icon: '📈', color: 'rose' },
  spike: { icon: '⚡', color: 'amber' },
  recurring: { icon: '🔄', color: 'blue' },
  budget_warning: { icon: '⚠️', color: 'orange' },
  forecast_exceeded: { icon: '📊', color: 'purple' },
  default: { icon: '💡', color: 'slate' },
}

function getConfidenceLabel(confidence) {
  if (confidence >= 0.8) return 'High'
  if (confidence >= 0.5) return 'Medium'
  return 'Low'
}

function InsightCard({ insight }) {
  const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.default
  const confidenceLabel = getConfidenceLabel(insight.confidence)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-lg">
          {config.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-900">{insight.title}</h4>
            {insight.category && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                {insight.category}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">{insight.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span>Confidence: {confidenceLabel}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{insight.type?.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InsightCard
