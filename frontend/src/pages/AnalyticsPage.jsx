import { Link, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import DateRangePicker from '../components/analytics/DateRangePicker.jsx'
import { buildPresetRange } from '../utils/dateRangePresets.js'
import SpendingPieChart from '../components/analytics/SpendingPieChart.jsx'
import TrendLineChart from '../components/analytics/TrendLineChart.jsx'
import ComparisonBarChart from '../components/analytics/ComparisonBarChart.jsx'
import {
  fetchComparison,
  fetchSpendingBreakdown,
  fetchTrends,
} from '../services/analyticsService.js'

function ChartPanel({ title, subtitle, children, isLoading }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        children
      )}
    </section>
  )
}

function AnalyticsPage() {
  const { logout } = useAuth()
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get('type') === 'shared' ? 'shared' : 'personal'
  const [expenseType, setExpenseType] = useState(initialType)
  const [presetId, setPresetId] = useState('this-month')
  const [range, setRange] = useState(() => buildPresetRange('this-month'))
  const [breakdown, setBreakdown] = useState(null)
  const [trends, setTrends] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [breakdownData, trendsData, comparisonData] = await Promise.all([
        fetchSpendingBreakdown({
          type: expenseType,
          from: range.from,
          to: range.to,
        }),
        fetchTrends({
          type: expenseType,
          from: range.from,
          to: range.to,
          months: range.months,
        }),
        fetchComparison({ type: expenseType }),
      ])
      setBreakdown(breakdownData)
      setTrends(trendsData)
      setComparison(comparisonData)
    } catch (err) {
      setError(err.message || 'Failed to load analytics')
      setBreakdown(null)
      setTrends(null)
      setComparison(null)
    } finally {
      setIsLoading(false)
    }
  }, [expenseType, range.from, range.to, range.months])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  function handlePresetChange(nextPresetId) {
    setPresetId(nextPresetId)
    setRange(buildPresetRange(nextPresetId))
  }

  function handleCustomRangeChange({ from, to }) {
    setPresetId('custom')
    setRange((prev) => ({
      ...prev,
      presetId: 'custom',
      from: from || prev.from,
      to: to || prev.to,
    }))
  }

  const emptyMessage = breakdown?.message || trends?.message || comparison?.message

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
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
              <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
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

        <div className="flex flex-wrap gap-2">
          {['personal', 'shared'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setExpenseType(type)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                expenseType === type
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <DateRangePicker
          presetId={presetId}
          from={range.from}
          to={range.to}
          onPresetChange={handlePresetChange}
          onCustomRangeChange={handleCustomRangeChange}
        />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {emptyMessage && !isLoading ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {emptyMessage}
          </div>
        ) : null}

        <ChartPanel
          title="Spending breakdown"
          subtitle="Share of spend by category"
          isLoading={isLoading}
        >
          <SpendingPieChart breakdown={breakdown?.breakdown} total={breakdown?.total} />
        </ChartPanel>

        <ChartPanel
          title="Monthly trends"
          subtitle="Top categories over time"
          isLoading={isLoading}
        >
          <TrendLineChart months={trends?.months} series={trends?.series} />
        </ChartPanel>

        <ChartPanel
          title="Month comparison"
          subtitle={
            comparison
              ? `${comparison.currentMonth?.key} vs ${comparison.previousMonth?.key}${
                  comparison.forecastNote ? ` · ${comparison.forecastNote}` : ''
                }`
              : ''
          }
          isLoading={isLoading}
        >
          <ComparisonBarChart
            categories={comparison?.categories}
            currentLabel={comparison?.currentMonth?.key ?? 'Current'}
            previousLabel={comparison?.previousMonth?.key ?? 'Previous'}
          />
        </ChartPanel>
      </div>
    </main>
  )
}

export default AnalyticsPage
