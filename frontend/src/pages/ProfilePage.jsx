import { Link } from 'react-router-dom'

const MOCK_USER = {
  firstName: 'Dana',
  lastName: 'Hanin',
  email: 'dana@example.com',
  partnerName: 'Jane',
}

function ProfilePage() {
  const initials = `${MOCK_USER.firstName[0]}${MOCK_USER.lastName[0]}`

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-lg">
        <header className="mb-6 flex items-center gap-3">
          <Link
            to="/app"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">2Bee</p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
              {initials}
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-semibold text-slate-900">
                {MOCK_USER.firstName} {MOCK_USER.lastName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{MOCK_USER.email}</p>
            </div>

            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Paired with {MOCK_USER.partnerName}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400"
            >
              Edit Profile
            </button>

            <Link
              to="/app/settings"
              className="block w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-center text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              Go to Settings
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
