import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ViewToggle from '../components/hive/ViewToggle.jsx'
import ExpenseList from '../components/hive/ExpenseList.jsx'
import { useHive, useExpenses } from '../hooks/useHive.js'

const DEMO_HIVE_ID = localStorage.getItem('twobee_hive_id') || ''

function BalanceHero({ hive, isLoading }) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white">
        <div className="h-4 w-24 rounded bg-white/30" />
        <div className="mt-3 h-8 w-36 rounded bg-white/30" />
      </div>
    )
  }

  if (!hive) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-medium text-amber-800">
          No Hive connected yet. Run <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">npm run seed</code> in the backend
          and save the Hive ID to localStorage key <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">twobee_hive_id</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white shadow-lg">
      <p className="text-sm font-medium uppercase tracking-wider text-indigo-200">The Hive</p>
      <p className="mt-1 text-3xl font-bold">Shared Account</p>
      <p className="mt-2 text-sm text-indigo-200">
        {hive.userIds?.length || 0} partners &middot; Created{' '}
        {new Date(hive.createdAt).toLocaleDateString('en-IL', { month: 'short', year: 'numeric' })}
      </p>
    </div>
  )
}

function HiveScreen() {
  const { logout } = useAuth()
  const [view, setView] = useState('shared')
  const { hive, isLoading: hiveLoading } = useHive(DEMO_HIVE_ID)
  const { expenses, isLoading: expLoading, error } = useExpenses(DEMO_HIVE_ID, view)

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
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
              <h1 className="text-xl font-semibold text-slate-900">Hive</h1>
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

        <BalanceHero hive={hive} isLoading={hiveLoading} />

        <div className="flex items-center justify-between">
          <ViewToggle active={view} onChange={setView} />
        </div>

        <ExpenseList expenses={expenses} isLoading={expLoading} error={error} />
      </div>
    </main>
  )
}

export default HiveScreen
