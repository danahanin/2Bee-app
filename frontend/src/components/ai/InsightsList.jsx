import HivePanel from '../hive/primitives/HivePanel.jsx'
import HiveEmptyState from '../hive/primitives/HiveEmptyState.jsx'

function InsightsList({ insights, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="hive-skeleton h-24" />
        ))}
      </div>
    )
  }

  if (!insights?.length) {
    return <HiveEmptyState message="Keep tracking — insights will buzz in soon!" icon="💡" />
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <HivePanel key={insight.id} className="p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg">💡</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-[var(--chamber-accent-dark)]">{insight.title}</h4>
                {insight.category && <span className="hive-badge hive-badge-muted">{insight.category}</span>}
              </div>
              <p className="mt-1 text-sm opacity-80">{insight.description}</p>
              <p className="mt-2 text-xs opacity-55">{insight.type?.replace('_', ' ')}</p>
            </div>
          </div>
        </HivePanel>
      ))}
    </div>
  )
}

export default InsightsList
