function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function getConfidenceLabel(confidence) {
  if (confidence >= 0.8) return 'High'
  if (confidence >= 0.5) return 'Medium'
  return 'Low'
}

function GoalCard({ goal, onAccept }) {
  const confidenceLabel = getConfidenceLabel(goal.confidence)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-slate-900">{goal.title}</h4>
          <p className="mt-1 text-sm text-slate-600">{goal.description}</p>
          {goal.reasoning && (
            <p className="mt-2 text-xs italic text-slate-500">{goal.reasoning}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            {goal.category && <span className="capitalize">{goal.category}</span>}
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>Confidence: {confidenceLabel}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-slate-500">Target</p>
          <p className="text-lg font-bold text-indigo-600">{formatCurrency(goal.targetAmount)}</p>
          {goal.suggestedMonthlyContribution > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {formatCurrency(goal.suggestedMonthlyContribution)}/mo
            </p>
          )}
        </div>
      </div>
      {onAccept && (
        <button
          type="button"
          onClick={() => onAccept(goal)}
          className="mt-3 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          Accept Goal
        </button>
      )}
    </div>
  )
}

function GoalsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, idx) => (
        <div key={idx} className="h-36 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )
}

function GoalSuggestionsPanel({ goals, isLoading, onAccept }) {
  if (isLoading) {
    return <GoalsSkeleton />
  }

  if (!goals?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">No goal suggestions at this time. Keep tracking to get personalized goals!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} onAccept={onAccept} />
      ))}
    </div>
  )
}

export default GoalSuggestionsPanel
