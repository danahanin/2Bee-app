import HiveCard from '../design-system/HiveCard.jsx'
import { formatCurrency } from '../../utils/formatCurrency.js'

function MonthlyAIReport({
  personalDashboard,
  sharedDashboard,
  balance,
  current,
  partner,
  insights,
  recommendations,
  isLoading,
}) {
  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-[var(--honey-50)]" />
  }

  const monthLabel = new Date().toLocaleDateString('en-IL', { month: 'long', year: 'numeric' })
  const personalSpend = personalDashboard?.totalSpendThisMonth ?? 0
  const sharedSpend = sharedDashboard?.totalJointSpendThisMonth ?? balance?.totalSharedSpend ?? 0
  const topPersonal = personalDashboard?.topCategory
  const topShared = sharedDashboard?.topSharedCategory

  const contributions = balance?.contributions || []
  const currentPaid = contributions.find((c) => c.userId === current?.id)?.paid ?? 0
  const partnerPaid = contributions.find((c) => c.userId === partner?.id)?.paid ?? 0
  const paidMore =
    currentPaid > partnerPaid + 0.01
      ? 'You'
      : partnerPaid > currentPaid + 0.01
        ? partner?.firstName || 'Your partner'
        : 'Even split'

  const topInsights = (insights || []).slice(0, 3)
  const nextStep = recommendations?.[0]?.title || 'Review shared categories and set a monthly budget together.'

  return (
    <section id="monthly-report">
      <HiveCard className="p-6">
      <p className="hive-eyebrow">Monthly AI Report</p>
      <h2 className="hive-title mt-1 text-xl">{monthLabel}</h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 text-sm text-[var(--brown-text)]">
          <p>
            <span className="font-semibold">Personal spend:</span>{' '}
            {formatCurrency(personalSpend, { maximumFractionDigits: 0 })}
            {topPersonal ? ` · top category ${topPersonal.category}` : ''}
          </p>
          <p>
            <span className="font-semibold">Shared spend:</span>{' '}
            {formatCurrency(sharedSpend, { maximumFractionDigits: 0 })}
            {topShared ? ` · top category ${topShared.category}` : ''}
          </p>
          <p>
            <span className="font-semibold">Who paid more:</span> {paidMore}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brown-muted)]">Key insights</p>
          {topInsights.length ? (
            <ul className="space-y-2 text-sm text-[var(--brown-muted)]">
              {topInsights.map((item) => (
                <li key={item.id} className="rounded-lg bg-[var(--honey-50)] px-3 py-2">
                  <span className="font-semibold text-[var(--brown-text)]">{item.title}</span>
                  <span className="block text-xs">{item.description}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--brown-muted)]">Add more expenses to unlock monthly insights.</p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--honey-200)] bg-[var(--honey-50)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--honey-800)]">Suggested next step</p>
        <p className="mt-1 text-sm text-[var(--brown-text)]">{nextStep}</p>
      </div>
    </HiveCard>
    </section>
  )
}

export default MonthlyAIReport
