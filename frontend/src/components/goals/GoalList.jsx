function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(
    amount,
  )
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IL', { year: 'numeric', month: 'short', day: 'numeric' })
}

function GoalList({ goals, isLoading, onAddGoal }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="h-24 animate-pulse rounded-xl bg-[var(--honey-50)]" />
        ))}
      </div>
    )
  }

  if (!goals?.length) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--brown-muted)]">No savings goals yet.</p>
        {onAddGoal ? (
          <button
            type="button"
            onClick={onAddGoal}
            className="rounded-xl bg-gradient-to-r from-[var(--honey-400)] to-[var(--honey-600)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Add goal
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <article key={goal.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">{goal.title}</h3>
              {goal.category ? (
                <p className="mt-1 text-xs capitalize text-slate-500">{goal.category}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">Deadline: {formatDate(goal.deadline)}</p>
            </div>
            <p className="text-sm font-semibold text-indigo-700">{goal.progressPercent}%</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.min(100, goal.progressPercent || 0)}%` }}
            />
          </div>
        </article>
      ))}
    </div>
  )
}

export default GoalList
