import { useEffect, useMemo, useState } from 'react'
import HiveLayout from '../components/hive/HiveLayout.jsx'
import HoneyJar, { HoneyJarRow, HoneyJarGrid } from '../components/hive/primitives/HoneyJar.jsx'
import PeriodSelector from '../components/dashboard/PeriodSelector.jsx'
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { usePartnerProfile } from '../hooks/usePartnerProfile.js'
import { fetchPersonalDashboard } from '../services/dashboardService.js'
import { formatPeriodRange } from '../lib/dashboardUtils.js'

function MetricCard({ title, value, subtitle, icon, fillPercent }) {
  return <HoneyJar label={title} value={value} sublabel={subtitle} icon={icon} fillPercent={fillPercent} />
}

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function PersonalDashboard() {
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
        const result = await fetchPersonalDashboard(period)
        if (mounted) {
          setData(result)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load personal dashboard')
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

  const topCategoryLabel = useMemo(() => {
    if (!data?.topCategory) return 'No personal spending in this period'
    return `${data.topCategory.category} • ${formatCurrency(data.topCategory.amount)}`
  }, [data])

  const periodHint = useMemo(() => formatPeriodRange(data?.period), [data?.period])

  const allTimeHint =
    data?.allTime && period !== 'all'
      ? `All time: ${formatCurrency(data.allTime.totalPersonalSpend)} personal · ${formatCurrency(data.allTime.totalSharedPaidByYou)} hive payments`
      : null

  const personalCategories = data?.personalSpendByCategory ?? (data?.topCategory ? [data.topCategory] : [])
  const hiveCategories = data?.hivePaymentsByCategory ?? []

  return (
    <HiveLayout
      title="Personal Chamber"
      subtitle="Your spend & budgets"
      chamberName="Collect Chamber"
      theme="collect"
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
          {allTimeHint ? (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2 text-xs text-amber-900/80">
              {allTimeHint}
            </p>
          ) : null}

          <HoneyJarRow>
            <MetricCard title="Personal Spend" icon="🐝" value={formatCurrency(data.totalPersonalSpend)} subtitle="Personal-only expenses" fillPercent={72} />
            <MetricCard title="Hive Payments" icon="🍯" value={formatCurrency(data.totalSharedPaidByYou)} subtitle="Shared expenses you paid" fillPercent={58} />
            <MetricCard title="Top Category" icon="📊" value={data.topCategory?.category || 'N/A'} subtitle={topCategoryLabel} fillPercent={90} />
          </HoneyJarRow>

          <CategoryBreakdown
            title="Personal by Category"
            subtitle="All personal-only expenses in this period"
            items={personalCategories}
            emptyMessage={
              data.totalPersonalSpend > 0
                ? 'Category breakdown loading — refresh the page or restart the backend.'
                : 'No personal spending in this period.'
            }
          />

          <CategoryBreakdown
            title="Your Hive Payments by Category"
            subtitle="Shared expenses you paid, grouped by category"
            items={hiveCategories}
            emptyMessage={
              data.totalSharedPaidByYou > 0
                ? 'Category breakdown loading — refresh the page or restart the backend.'
                : 'No hive payments in this period.'
            }
          />

          <HivePanel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800/70">Budget Status</h2>
              <p className="text-xs text-amber-800/60">Includes your hive payments for shared categories</p>
            </div>
            {data.budgetStatus?.length ? (
              <HoneyJarGrid>
                {data.budgetStatus.map((item) => (
                  <HoneyJar
                    key={item.id}
                    size="sm"
                    label={item.category}
                    value={`${item.percentUsed}%`}
                    sublabel={`${formatCurrency(item.spent)} / ${formatCurrency(item.limit)}`}
                    fillPercent={Math.min(100, item.percentUsed)}
                    icon="🍯"
                  />
                ))}
              </HoneyJarGrid>
            ) : (
              <p className="mt-3 text-sm opacity-75">No personal budgets yet.</p>
            )}
          </HivePanel>
        </>
      ) : null}
    </HiveLayout>
  )
}

export default PersonalDashboard
