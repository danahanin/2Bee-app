import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchPersonalDashboard } from '../services/dashboardService.js'

function MetricCard({ title, value, subtitle }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
    </article>
  )
}

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function PersonalDashboard() {
  const { logout } = useAuth()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setError('')
      try {
        const result = await fetchPersonalDashboard()
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
  }, [])

  const topCategoryLabel = useMemo(() => {
    if (!data?.topCategory) return 'No spending yet this month'
    return `${data.topCategory.category} • ${formatCurrency(data.topCategory.amount)}`
  }, [data])

  return (
    <main className="min-h-screen p-4 md:p-8">
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
              <h1 className="text-xl font-semibold text-slate-900">Personal Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <Link
            to="/app/analytics?type=personal"
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            View charts
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Log out
          </button>
          </div>
        </header>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
        ) : null}

        {!isLoading && !error && data ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard title="Monthly Spend" value={formatCurrency(data.totalSpendThisMonth)} subtitle="Personal expenses" />
              <MetricCard title="Top Category" value={data.topCategory?.category || 'N/A'} subtitle={topCategoryLabel} />
              <MetricCard title="Budget Items" value={String(data.budgetStatus?.length || 0)} subtitle="Personal budgets tracked" />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Budget Status</h2>
              {data.budgetStatus?.length ? (
                <div className="mt-3 space-y-3">
                  {data.budgetStatus.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{item.category}</p>
                        <p className="text-sm text-slate-600">{item.percentUsed}% used</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatCurrency(item.spent)} / {formatCurrency(item.limit)} ({item.period})
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-600">No personal budgets yet.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}

export default PersonalDashboard
