import ImbalanceCard from './ImbalanceCard.jsx'
import ForecastSection from './ForecastSection.jsx'
import InsightsList from './InsightsList.jsx'
import RecommendationCard from './RecommendationCard.jsx'
import GoalSuggestionsPanel from './GoalSuggestionsPanel.jsx'

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </section>
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

function RecommendationsBlock({ recommendations, isLoading, onAction }) {
  if (isLoading) return <RecommendationsSkeleton />

  if (!recommendations?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">No recommendations at this time.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} recommendation={rec} onAction={onAction} />
      ))}
    </div>
  )
}

function InsightsPanel({
  insights,
  recommendations,
  forecast,
  imbalance,
  goalSuggestions,
  isLoading,
  onGoalAccept,
  onRecommendationAction,
}) {
  return (
    <div className="space-y-6">
      <Section title="Contribution balance" subtitle="How evenly you and your partner are contributing">
        <ImbalanceCard imbalance={imbalance} isLoading={isLoading} />
      </Section>

      <Section title="Spending Forecast" subtitle="AI-predicted spending for each category this month">
        <ForecastSection forecasts={forecast} isLoading={isLoading} />
      </Section>

      <Section title="Insights" subtitle="Patterns and observations from your spending behavior">
        <InsightsList insights={insights} isLoading={isLoading} />
      </Section>

      <Section title="Recommendations" subtitle="Actionable tips to improve your finances">
        <RecommendationsBlock
          recommendations={recommendations}
          isLoading={isLoading}
          onAction={onRecommendationAction}
        />
      </Section>

      <Section title="Goal Suggestions" subtitle="Personalized savings goals based on your spending">
        <GoalSuggestionsPanel goals={goalSuggestions} isLoading={isLoading} onAccept={onGoalAccept} />
      </Section>
    </div>
  )
}

export default InsightsPanel
