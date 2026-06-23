import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import HoneycombBackground from '../components/design-system/HoneycombBackground.jsx'
import HoneycombNav from '../components/design-system/HoneycombNav.jsx'
import Hexagon from '../components/design-system/Hexagon.jsx'
import UserAvatar from '../components/design-system/UserAvatar.jsx'
import { useProfile } from '../hooks/useProfile.js'

function AppShell() {
  const { currentUser, logout } = useAuth()
  const { profile } = useProfile()
  const displayName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'User'

  return (
    <div className="relative min-h-screen">
      <HoneycombBackground />

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="hidden w-28 shrink-0 border-r border-[rgba(61,41,20,0.08)] bg-[var(--wax-surface)] lg:flex lg:flex-col lg:items-center">
          <div className="flex flex-col items-center gap-2 px-3 py-6">
            <Hexagon size={40} variant="filled" className="text-white">
              <span className="text-xs font-bold text-white">2B</span>
            </Hexagon>
            <span className="hive-eyebrow text-[10px]">2bee</span>
          </div>
          <HoneycombNav layout="sidebar" />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[rgba(61,41,20,0.08)] bg-[var(--wax-surface)] px-4 py-3 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 lg:hidden">
                <Hexagon size={32} variant="filled">
                  <span className="text-[10px] font-bold text-white">2B</span>
                </Hexagon>
                <div>
                  <p className="hive-eyebrow text-[10px]">2bee</p>
                  <p className="hive-title text-sm">Shared finance</p>
                </div>
              </div>
              <div className="hidden lg:block">
                <p className="hive-eyebrow">Welcome back</p>
                <p className="hive-title text-lg">{displayName}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full border border-[rgba(61,41,20,0.1)] bg-white px-3 py-1.5 sm:flex">
                  <UserAvatar user={{ ...currentUser, avatarUrl: profile.avatarUrl }} size="sm" />
                  <span className="max-w-[8rem] truncate text-sm text-[var(--brown-muted)]">{currentUser?.email}</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl border border-[rgba(61,41,20,0.15)] px-3 py-1.5 text-sm font-semibold text-[var(--brown-text)] transition hover:bg-[var(--honey-50)]"
                >
                  Log out
                </button>
              </div>
            </div>
            <div className="mt-3 hidden md:block lg:hidden">
              <HoneycombNav />
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-24 md:pb-8 md:px-6 md:py-8 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[rgba(61,41,20,0.1)] bg-[var(--wax-surface)] px-2 py-2 md:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        aria-label="Mobile navigation"
      >
        <HoneycombNav />
      </nav>
    </div>
  )
}

export default AppShell
