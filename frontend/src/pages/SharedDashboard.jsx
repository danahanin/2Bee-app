import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchSharedDashboard } from '../services/dashboardService.js'

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function SharedDashboard() {
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
        const result = await fetchSharedDashboard()
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
  }, [])

  const topShared = useMemo(() => {
    if (!data?.topSharedCategory) return 'No shared spending yet'
    return `${data.topSharedCategory.category} • ${formatCurrency(data.topSharedCategory.amount)}`
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
              <h1 className="text-xl font-semibold text-slate-900">Shared Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/app/analytics?type=shared"
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
            {!data.paired ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <h2 className="text-lg font-semibold">You are not paired yet</h2>
                <p className="mt-2 text-sm">{data.message || 'Pair with a partner to activate shared dashboard data.'}</p>
                <Link to="/app/hive" className="mt-4 inline-block text-sm font-semibold text-indigo-700">
                  Open Hive &rarr;
                </Link>
              </section>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-3">
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Joint Spend</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(data.totalJointSpendThisMonth)}</p>
                    <p className="mt-2 text-sm text-slate-600">Current month</p>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Top Shared Category</h3>
                    <p className="mt-2 text-lg font-bold text-slate-900">{data.topSharedCategory?.category || 'N/A'}</p>
                    <p className="mt-2 text-sm text-slate-600">{topShared}</p>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Shared Budgets</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{String(data.sharedBudgetStatus?.length || 0)}</p>
                    <p className="mt-2 text-sm text-slate-600">Configured budget items</p>
                  </article>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Partner Contributions</h2>
                  {data.contributions?.length ? (
                    <div className="mt-3 space-y-3">
                      {data.contributions.map((row) => (
                        <div key={row.userId} className="rounded-xl border border-slate-200 p-3">
                          <p className="text-sm text-slate-500">{row.userId}</p>
                          <p className="text-lg font-semibold text-slate-900">{formatCurrency(row.total)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">No shared contributions yet.</p>
                  )}
                </section>
              </>
            )}
          </>
        ) : null}
      </div>
    </main>
  )
}

export default SharedDashboard
