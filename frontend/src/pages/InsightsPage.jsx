import { useEffect } from 'react'
import HiveLayout from '../components/hive/HiveLayout.jsx'
import HivePanel from '../components/hive/primitives/HivePanel.jsx'
import HiveEmptyState from '../components/hive/primitives/HiveEmptyState.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { usePartnerProfile } from '../hooks/usePartnerProfile.js'
import { useInsights, useForecast, useRecommendations, useGoalSuggestions } from '../hooks/useAI.js'
import ForecastSection from '../components/ai/ForecastSection.jsx'
import InsightsList from '../components/ai/InsightsList.jsx'
import RecommendationCard from '../components/ai/RecommendationCard.jsx'
import GoalSuggestionsPanel from '../components/ai/GoalSuggestionsPanel.jsx'

function SectionHeader({ title, subtitle, icon }) {
  return (
    <div className="mb-4">
      {icon ? <p className="text-2xl">{icon}</p> : null}
      <h2 className="hive-panel-title">{title}</h2>
      {subtitle && <p className="hive-panel-sub">{subtitle}</p>}
    </div>
  )
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="hive-skeleton h-28" />
      ))}
    </div>
  )
}

function InsightsPage() {
  const { profile } = useProfile()
  const { partner } = usePartnerProfile()
  const insights = useInsights()
  const forecast = useForecast()
  const recommendations = useRecommendations()
  const goalSuggestions = useGoalSuggestions()

  useEffect(() => {
    insights.fetch()
    forecast.fetch()
    recommendations.fetch()
    goalSuggestions.fetch()
  }, [])

  const hasError = insights.error || forecast.error || recommendations.error || goalSuggestions.error

  function handleGoalAccept(goal) {
    console.log('Goal accepted:', goal)
  }

  function handleRecommendationAction(recommendation) {
    console.log('Recommendation action:', recommendation)
  }

  return (
    <HiveLayout title="Grow Chamber" subtitle="Forecasts, tips & goals" chamberName="Grow Chamber" theme="grow" profile={profile} partner={partner}>
      {hasError && (
        <div className="hive-alert hive-alert-error">
          {insights.error || forecast.error || recommendations.error || goalSuggestions.error}
        </div>
      )}

      <HivePanel className="p-5">
        <SectionHeader title="Spending Forecast" subtitle="Predicted honey flow per category" icon="✨" />
        <ForecastSection forecasts={forecast.data} isLoading={forecast.loading} />
      </HivePanel>

      <HivePanel className="p-5">
        <SectionHeader title="Hive Insights" subtitle="Patterns from your buzzing activity" icon="💡" />
        <InsightsList insights={insights.data} isLoading={insights.loading} />
      </HivePanel>

      <HivePanel className="p-5">
        <SectionHeader title="Recommendations" subtitle="Tips to sweeten your finances" icon="🍯" />
        {recommendations.loading ? (
          <RecommendationsSkeleton />
        ) : !recommendations.data?.length ? (
          <HiveEmptyState message="No tips right now — keep tracking!" icon="🐝" />
        ) : (
          <div className="space-y-3">
            {recommendations.data.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} onAction={handleRecommendationAction} />
            ))}
          </div>
        )}
      </HivePanel>

      <HivePanel className="p-5">
        <SectionHeader title="Goal Seeds" subtitle="Personalized savings goals for your hive" icon="🌱" />
        <GoalSuggestionsPanel goals={goalSuggestions.data} isLoading={goalSuggestions.loading} onAccept={handleGoalAccept} />
      </HivePanel>
    </HiveLayout>
  )
}

export default InsightsPage
