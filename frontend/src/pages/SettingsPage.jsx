import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    id: 'account',
    title: 'Account',
    description: 'Manage your profile information',
  },
  {
    id: 'privacy',
    title: 'Privacy',
    description: 'Control what your partner can see',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Manage your alert preferences',
  },
  {
    id: 'pairing',
    title: 'Pairing',
    description: 'Partner: Jane · Connected',
  },
]

function SettingsPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-lg">
        <header className="mb-6 flex items-center gap-3">
          <Link
            to="/app/profile"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">2Bee</p>
        </header>

        <h1 className="mb-4 text-2xl font-semibold text-slate-900">Settings</h1>

        <div className="flex flex-col gap-3">
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-slate-700">{section.description}</p>
            </div>
          ))}

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-500">
              Danger Zone
            </h2>
            <p className="mt-1 text-sm text-red-700">Disconnect from partner</p>
            <button
              type="button"
              disabled
              className="mt-3 cursor-not-allowed rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-400"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default SettingsPage
