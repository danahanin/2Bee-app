import InsightCard from './InsightCard'

function InsightsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )
}

function InsightsList({ insights, isLoading }) {
  if (isLoading) {
    return <InsightsSkeleton />
  }

  if (!insights?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">No insights available yet. Keep tracking your expenses!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  )
}

export default InsightsList
