function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function ConfidenceBar({ confidence }) {
  const percent = Math.round((confidence || 0) * 100)
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Confidence</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function ForecastCard({ forecast }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold capitalize text-slate-900">{forecast.category}</h4>
      <p className="mt-1 text-2xl font-bold text-indigo-600">{formatCurrency(forecast.predicted)}</p>
      <p className="text-xs text-slate-500">Predicted spend</p>
      <ConfidenceBar confidence={forecast.confidence} />
    </div>
  )
}

function ForecastSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )
}

function ForecastSection({ forecasts, isLoading }) {
  if (isLoading) {
    return <ForecastSkeleton />
  }

  if (!forecasts?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">No forecast data available. Add more expenses to see predictions.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {forecasts.map((forecast) => (
        <ForecastCard key={forecast.category} forecast={forecast} />
      ))}
    </div>
  )
}

export default ForecastSection
