import HivePanel from '../hive/primitives/HivePanel.jsx'
import HiveButton from '../hive/primitives/HiveButton.jsx'
import HiveEmptyState from '../hive/primitives/HiveEmptyState.jsx'

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

const PRIORITY_CONFIG = {
  1: { label: 'High', classes: 'hive-badge-rose' },
  2: { label: 'Medium', classes: 'hive-badge-amber' },
  3: { label: 'Low', classes: 'hive-badge-muted' },
}

function GoalSuggestionsPanel({ goals, isLoading, onAccept }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="hive-skeleton h-36" />
        ))}
      </div>
    )
  }

  if (!goals?.length) {
    return <HiveEmptyState message="Keep buzzing — personalized savings goals will appear here!" icon="🌱" />
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <HivePanel key={goal.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-[var(--chamber-accent-dark)]">{goal.title}</h4>
              <p className="mt-1 text-sm opacity-80">{goal.description}</p>
              {goal.reasoning && <p className="mt-2 text-xs italic opacity-60">{goal.reasoning}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs opacity-60">Target</p>
              <p className="text-lg font-bold text-[var(--chamber-accent-dark)]">{formatCurrency(goal.targetAmount)}</p>
            </div>
          </div>
          {onAccept && (
            <HiveButton type="button" onClick={() => onAccept(goal)} className="mt-3 w-full">
              Plant this goal 🌱
            </HiveButton>
          )}
        </HivePanel>
      ))}
    </div>
  )
}

export default GoalSuggestionsPanel
