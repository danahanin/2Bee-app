import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useInsights, useForecast, useRecommendations, useGoalSuggestions } from '../hooks/useAI.js'
import ForecastSection from '../components/ai/ForecastSection.jsx'
import InsightsList from '../components/ai/InsightsList.jsx'
import RecommendationCard from '../components/ai/RecommendationCard.jsx'
import GoalSuggestionsPanel from '../components/ai/GoalSuggestionsPanel.jsx'

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="h-28 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )
}

function InsightsPage() {
  const { logout } = useAuth()
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
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              &larr; Back
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">2Bee</p>
              <h1 className="text-xl font-semibold text-slate-900">AI Insights</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Log out
          </button>
        </header>

        {hasError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {insights.error || forecast.error || recommendations.error || goalSuggestions.error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            title="Spending Forecast"
            subtitle="AI-predicted spending for each category this month"
          />
          <ForecastSection forecasts={forecast.data} isLoading={forecast.loading} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            title="Insights"
            subtitle="Patterns and observations from your spending behavior"
          />
          <InsightsList insights={insights.data} isLoading={insights.loading} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            title="Recommendations"
            subtitle="Actionable tips to improve your finances"
          />
          {recommendations.loading ? (
            <RecommendationsSkeleton />
          ) : !recommendations.data?.length ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-600">No recommendations at this time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.data.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAction={handleRecommendationAction}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            title="Goal Suggestions"
            subtitle="Personalized savings goals based on your spending"
          />
          <GoalSuggestionsPanel
            goals={goalSuggestions.data}
            isLoading={goalSuggestions.loading}
            onAccept={handleGoalAccept}
          />
        </section>
      </div>
    </main>
  )
}

export default InsightsPage
