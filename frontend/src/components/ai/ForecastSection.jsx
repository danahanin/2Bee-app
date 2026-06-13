import HoneyJar, { HoneyJarGrid } from '../hive/primitives/HoneyJar.jsx'
import HiveEmptyState from '../hive/primitives/HiveEmptyState.jsx'

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function fillPercent(amount, max) {
  if (!max) return 40
  return Math.max(20, Math.round((amount / max) * 100))
}

function ForecastSection({ forecasts, isLoading }) {
  if (isLoading) {
    return (
      <HoneyJarGrid>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="hive-skeleton h-32 w-24" />
        ))}
      </HoneyJarGrid>
    )
  }

  if (!forecasts?.length) {
    return <HiveEmptyState message="Add more expenses and we'll predict your honey flow." icon="✨" />
  }

  const max = Math.max(...forecasts.map((f) => f.predictedAmount))

  return (
    <HoneyJarGrid>
      {forecasts.map((forecast) => (
        <HoneyJar
          key={forecast.category}
          size="sm"
          label={forecast.category}
          value={formatCurrency(forecast.predictedAmount)}
          sublabel={`${Math.round((forecast.confidence || 0) * 100)}% confident`}
          fillPercent={fillPercent(forecast.predictedAmount, max)}
          icon="✨"
        />
      ))}
    </HoneyJarGrid>
  )
}

export default ForecastSection
