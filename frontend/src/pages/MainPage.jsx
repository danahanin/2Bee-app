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
              This is the initial post-login dashboard shell. Next modules (Hive, Analytics, AI insights) can plug
              into these cards without changing the auth flow.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</h3>
            <p className="mt-2 text-sm text-slate-700">{user?.user?.email}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Hive</h3>
            <p className="mt-2 text-sm text-slate-600">Placeholder for shared balance overview.</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Personal</h3>
            <p className="mt-2 text-sm text-slate-600">Placeholder for individual budget snapshot.</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI Insights</h3>
            <p className="mt-2 text-sm text-slate-600">Placeholder for recommendations and forecast cards.</p>
          </article>
        </section>
      </div>
    </main>
  )
}

export default MainPage
