import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { useAIPageData } from '../hooks/useAIPageData.js'
import PartnerAvatars from '../components/design-system/PartnerAvatars.jsx'
import AIFinancialOverview from '../components/ai/AIFinancialOverview.jsx'
import AIAlertsStrip from '../components/ai/AIAlertsStrip.jsx'
import SuggestedActions from '../components/ai/SuggestedActions.jsx'
import CompactChatAssistant from '../components/ai/CompactChatAssistant.jsx'
import InsightsPanel from '../components/ai/InsightsPanel.jsx'

function ctaToRoute(cta = '') {
  const text = cta.toLowerCase()
  if (text.includes('transfer') || text.includes('settle') || text.includes('balance')) return '/app/hive'
  if (text.includes('budget') || text.includes('breakdown')) return '/app/expenses?tab=analytics'
  if (text.includes('subscription')) return '/app/expenses?tab=expenses&category=subscriptions'
  return '/app/expenses?tab=expenses'
}

function AssistantPage() {
  const { currentUser, pairingStatus } = useAuth()
  const { profile } = useProfile()
  const navigate = useNavigate()
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
    goalSuggestions,
    imbalance,
    alerts,
    overviewSummary,
    loading,
    error,
  } = useAIPageData(hiveId, currentUser?.id)

  function handleRecommendationAction(rec) {
    navigate(ctaToRoute(rec?.cta))
  }

  function handleGoalAccept(goal) {
    navigate('/app/expenses?tab=analytics', { state: { suggestedGoal: goal } })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="hive-eyebrow">AI Control Center</p>
          <h1 className="hive-title text-2xl md:text-3xl">Insights for your hive</h1>
          <p className="mt-1 text-sm text-[var(--brown-muted)]">
            Your spending overview, alerts, forecast, and recommendations — with chat when you need it.
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
        <p className="hive-eyebrow">Alerts</p>
        <AIAlertsStrip alerts={alerts} isLoading={loading} />
      </section>

      <section className="space-y-3">
        <p className="hive-eyebrow">Suggested actions</p>
        <SuggestedActions />
      </section>

      <InsightsPanel
        insights={insights}
        recommendations={recommendations}
        forecast={forecast}
        imbalance={imbalance}
        goalSuggestions={goalSuggestions}
        isLoading={loading}
        onGoalAccept={handleGoalAccept}
        onRecommendationAction={handleRecommendationAction}
      />

      <CompactChatAssistant hiveId={hiveId} />
    </div>
  )
}

export default AssistantPage
