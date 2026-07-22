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
    <div className="relative min-h-screen min-h-dvh">
      <HoneycombBackground />

      <div className="mx-auto flex min-h-screen min-h-dvh w-full max-w-7xl flex-col lg:flex-row">
        <aside className="hidden w-28 shrink-0 border-r border-[rgba(61,41,20,0.08)] bg-[var(--wax-surface)] lg:flex lg:flex-col lg:items-center">
          <div className="flex flex-col items-center gap-2 px-3 py-6">
            <Hexagon size={40} variant="filled" className="text-white">
              <span className="text-xs font-bold text-white">2B</span>
            </Hexagon>
            <span className="hive-eyebrow text-[10px]">2bee</span>
          </div>
          <HoneycombNav layout="sidebar" />
        </aside>

        <div className="flex min-h-screen min-h-dvh min-w-0 w-full flex-1 flex-col">
          <header
            className="sticky top-0 z-20 border-b border-[rgba(61,41,20,0.08)] bg-[var(--wax-surface)] px-3 py-2.5 sm:px-4 md:px-6 md:py-3"
            style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
          >
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3 lg:hidden">
                <Hexagon size={28} variant="filled">
                  <span className="text-[9px] font-bold text-white">2B</span>
                </Hexagon>
                <div className="min-w-0">
                  <p className="hive-eyebrow text-[10px]">2bee</p>
                  <p className="hive-title truncate text-sm">Shared finance</p>
                </div>
              </div>
              <div className="hidden lg:block">
                <p className="hive-eyebrow">Welcome back</p>
                <p className="hive-title text-lg">{displayName}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <div className="hidden items-center gap-2 rounded-full border border-[rgba(61,41,20,0.1)] bg-white px-3 py-1.5 sm:flex">
                  <UserAvatar user={{ ...currentUser, avatarUrl: profile.avatarUrl }} size="sm" />
                  <span className="max-w-[8rem] truncate text-sm text-[var(--brown-muted)]">{currentUser?.email}</span>
                </div>
                <div className="sm:hidden">
                  <UserAvatar user={{ ...currentUser, avatarUrl: profile.avatarUrl }} size="sm" />
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="min-h-10 rounded-xl border border-[rgba(61,41,20,0.15)] px-2.5 py-2 text-xs font-semibold text-[var(--brown-text)] transition hover:bg-[var(--honey-50)] sm:px-3 sm:text-sm"
                >
                  Log out
                </button>
              </div>
            </div>
            <div className="mt-3 hidden md:block lg:hidden">
              <HoneycombNav />
            </div>
          </header>

          <main className="min-w-0 w-full flex-1 overflow-x-hidden px-3 py-4 pb-28 sm:px-4 sm:py-6 md:px-6 md:py-8 md:pb-8 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[rgba(61,41,20,0.1)] bg-[var(--wax-surface)] px-1 pt-1.5 shadow-[0_-4px_16px_rgba(61,41,20,0.06)] md:hidden"
        style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
        aria-label="Mobile navigation"
      >
        <HoneycombNav />
      </nav>
    </div>
  )
}

export default AppShell
