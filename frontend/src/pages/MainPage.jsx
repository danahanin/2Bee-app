import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function MainPage() {
  const { user, logout } = useAuth()

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">2Bee</p>
            <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Main Screen</h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Log out
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Welcome, {user?.user?.name || 'User'}!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your navigation hub for Hive and dashboard modules. Open personal or shared summaries using the cards
              below.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</h3>
            <p className="mt-2 text-sm text-slate-700">{user?.user?.email}</p>
          </article>

          <Link
            to="/app/hive"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 group-hover:text-indigo-600">
              Hive
            </h3>
            <p className="mt-2 text-sm text-slate-600">View shared expenses and balance with your partner.</p>
            <span className="mt-3 inline-block text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100">
              Open &rarr;
            </span>
          </Link>

          <Link
            to="/app/dashboard/personal"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 group-hover:text-indigo-600">
              Personal Dashboard
            </h3>
            <p className="mt-2 text-sm text-slate-600">Open your monthly spend summary and budget status.</p>
            <span className="mt-3 inline-block text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100">
              Open &rarr;
            </span>
          </Link>

          <Link
            to="/app/dashboard/shared"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 group-hover:text-indigo-600">
              Shared Dashboard
            </h3>
            <p className="mt-2 text-sm text-slate-600">View joint spending, top shared category, and contributions.</p>
            <span className="mt-3 inline-block text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100">
              Open &rarr;
            </span>
          </Link>
        </section>
      </div>
    </main>
  )
}

export default MainPage
