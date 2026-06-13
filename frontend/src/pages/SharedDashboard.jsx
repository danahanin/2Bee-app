import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import HiveLayout from '../components/hive/HiveLayout.jsx'
import HivePanel from '../components/hive/primitives/HivePanel.jsx'
import HoneyJar, { HoneyJarRow } from '../components/hive/primitives/HoneyJar.jsx'
import PeriodSelector from '../components/dashboard/PeriodSelector.jsx'
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown.jsx'
import Avatar from '../components/profile/Avatar.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { usePartnerProfile } from '../hooks/usePartnerProfile.js'
import { fetchSharedDashboard } from '../services/dashboardService.js'
import { formatPeriodRange } from '../lib/dashboardUtils.js'

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function SharedDashboard() {
  const { profile } = useProfile()
  const { partner } = usePartnerProfile()
  const [period, setPeriod] = useState('all')
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setError('')
      try {
        const result = await fetchSharedDashboard(period)
        if (mounted) {
          setData(result)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load shared dashboard')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()
    return () => {
      mounted = false
    }
  }, [period])

  const topShared = useMemo(() => {
    if (!data?.topSharedCategory) return 'No shared spending in this period'
    return `${data.topSharedCategory.category} • ${formatCurrency(data.topSharedCategory.amount)}`
  }, [data])

  const periodHint = useMemo(() => formatPeriodRange(data?.period), [data?.period])

  const allTimeHint =
    data?.allTime && period !== 'all'
      ? `All time joint spend: ${formatCurrency(data.allTime.totalJointSpend)}`
      : null

  const sharedCategories = data?.sharedSpendByCategory ?? (data?.topSharedCategory ? [data.topSharedCategory] : [])

  return (
    <HiveLayout
      title="Shared Chamber"
      subtitle="Joint spending & contributions"
      chamberName="Play Chamber"
      theme="play"
      profile={profile}
      partner={partner}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector value={period} onChange={setPeriod} disabled={isLoading} />
        {periodHint ? <p className="text-xs text-amber-800/65">{periodHint}</p> : null}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="hive-skeleton h-32" />
          ))}
        </div>
      ) : null}

      {error ? <div className="hive-alert hive-alert-error">{error}</div> : null}

      {!isLoading && !error && data ? (
        <>
          {!data.paired ? (
            <section className="hive-chamber hive-chamber-card p-5 text-[var(--chamber-accent-dark)]">
              <h2 className="text-lg font-semibold">You are not paired yet</h2>
              <p className="mt-2 text-sm">{data.message || 'Pair with a partner to activate shared dashboard data.'}</p>
              <Link to="/app/hive" className="mt-4 inline-block text-sm font-semibold text-amber-900 underline">
                Open Hive →
              </Link>
            </section>
          ) : (
            <>
              {allTimeHint ? (
                <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2 text-xs text-amber-900/80">
                  {allTimeHint}
                </p>
              ) : null}

              <HoneyJarRow>
                <HoneyJar label="Joint Spend" icon="🏠" value={formatCurrency(data.totalJointSpend)} sublabel={data.period?.label || 'Selected period'} fillPercent={80} />
                <HoneyJar label="Top Shared" icon="🍯" value={data.topSharedCategory?.category || 'N/A'} sublabel={topShared} fillPercent={70} />
                <HoneyJar label="Budgets" icon="📋" value={String(data.sharedBudgetStatus?.length || 0)} sublabel="Configured items" fillPercent={45} />
              </HoneyJarRow>

              <CategoryBreakdown
                title="Shared Spend by Category"
                subtitle="All joint hive expenses in this period"
                items={sharedCategories}
                emptyMessage={
                  data.totalJointSpend > 0
                    ? 'Category breakdown loading — refresh the page or restart the backend.'
                    : 'No shared spending in this period.'
                }
              />

              <HivePanel className="p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800/70">Partner Contributions</h2>
                <p className="mt-1 text-xs text-amber-800/60">Who paid shared expenses in this period</p>
                {data.contributions?.length ? (
                  <div className="mt-3 space-y-3">
                    {data.contributions.map((row) => {
                      const isYou = row.userId === profile.id
                      const member = isYou ? profile : partner
                      return (
                        <div
                          key={row.userId}
                          className="flex items-center gap-3 rounded-xl border border-amber-200/60 p-3"
                        >
                          <Avatar
                            avatarUrl={member?.avatarUrl}
                            firstName={member?.firstName}
                            lastName={member?.lastName}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm font-medium text-amber-950">
                              {isYou ? 'You' : `${partner?.firstName || 'Partner'}`}
                            </p>
                            <p className="text-lg font-semibold text-amber-900">{formatCurrency(row.total)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm opacity-75">No shared contributions in this period.</p>
                )}
              </HivePanel>
            </>
          )}
        </>
      ) : null}
    </HiveLayout>
  )
}

export default SharedDashboard
