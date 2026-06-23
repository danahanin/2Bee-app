import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { useAIPageData } from '../hooks/useAIPageData.js'
import PartnerAvatars from '../components/design-system/PartnerAvatars.jsx'
import HivePanel from '../components/design-system/HivePanel.jsx'
import AIFinancialOverview from '../components/ai/AIFinancialOverview.jsx'
import AIAlertsStrip from '../components/ai/AIAlertsStrip.jsx'
import RecommendationCard from '../components/ai/RecommendationCard.jsx'
import SuggestedActions from '../components/ai/SuggestedActions.jsx'
import MonthlyAIReport from '../components/ai/MonthlyAIReport.jsx'
import ForecastSection from '../components/ai/ForecastSection.jsx'
import CompactChatAssistant from '../components/ai/CompactChatAssistant.jsx'

function AssistantPage() {
  const { currentUser, pairingStatus } = useAuth()
  const { profile } = useProfile()
  const hiveId = pairingStatus?.hiveId || localStorage.getItem('twobee_hive_id') || ''

  const {
    balance,
    current,
    partner,
    personalDashboard,
    sharedDashboard,
    insights,
    recommendations,
    forecast,
    alerts,
    overviewSummary,
    loading,
    error,
  } = useAIPageData(hiveId, currentUser?.id)

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="hive-eyebrow">AI Control Center</p>
          <h1 className="hive-title text-2xl md:text-3xl">Insights for your hive</h1>
          <p className="mt-1 text-sm text-[var(--brown-muted)]">
            Overview, alerts, and recommendations — with chat when you need it.
          </p>
        </div>
        <PartnerAvatars
          user={{ ...currentUser, avatarUrl: profile.avatarUrl }}
          partner={partner}
        />
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <AIFinancialOverview
        balance={balance}
        current={current || { ...currentUser, avatarUrl: profile.avatarUrl }}
        partner={partner}
        personalDashboard={personalDashboard}
        sharedDashboard={sharedDashboard}
        overviewSummary={overviewSummary}
        isLoading={loading}
      />

      <section className="space-y-2">
        <p className="hive-eyebrow">Alerts &amp; insights</p>
        <AIAlertsStrip alerts={alerts} isLoading={loading} />
      </section>

      <HivePanel title="Smart recommendations" subtitle="Personalized ways to improve your hive finances">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--honey-50)]" />
            ))}
          </div>
        ) : recommendations?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} onAction={() => {}} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--brown-muted)]">No recommendations right now.</p>
        )}
      </HivePanel>

      <section className="space-y-3">
        <p className="hive-eyebrow">Suggested actions</p>
        <SuggestedActions />
      </section>

      <MonthlyAIReport
        personalDashboard={personalDashboard}
        sharedDashboard={sharedDashboard}
        balance={balance}
        current={current}
        partner={partner}
        insights={insights}
        recommendations={recommendations}
        isLoading={loading}
      />

      <HivePanel title="Forecast snapshot" subtitle="Predicted shared spending by category">
        <ForecastSection forecasts={forecast} isLoading={loading} />
      </HivePanel>

      <CompactChatAssistant hiveId={hiveId} />
    </div>
  )
}

export default AssistantPage
