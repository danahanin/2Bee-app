import { useLocation } from 'react-router-dom'
import HexButton from './HexButton.jsx'

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    to: '/app',
    match: (path) => path === '/app',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" />
      </svg>
    ),
  },
  {
    id: 'hive',
    label: 'Hive',
    to: '/app/hive',
    match: (path) => path.startsWith('/app/hive'),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6l4-3 4 3v6l-4 3-4-3V6zM4 14l4 3v5l-4-3v-5zM16 14l4 3v5l-4-3v-5z" />
      </svg>
    ),
  },
  {
    id: 'expenses',
    label: 'Expenses',
    to: '/app/expenses',
    match: (path) => path.startsWith('/app/expenses') || path.includes('/dashboard/personal') || path.includes('/analytics'),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'assistant',
    label: 'Assistant',
    to: '/app/assistant',
    match: (path) => path.startsWith('/app/assistant') || path.includes('/insights'),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a4 4 0 014 4c0 1.5-.8 2.8-2 3.5V11h4a4 4 0 110 8h-1.2a6 6 0 11-9.6 0H6a4 4 0 110-8h4V9.5A4 4 0 0112 2z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    to: '/app/profile',
    match: (path) => path.startsWith('/app/profile') || path.includes('/settings'),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
]

function NavItem({ item, active, stretch }) {
  return (
    <HexButton
      to={item.to}
      active={active}
      variant="primary"
      size="sm"
      className={stretch ? 'mx-auto' : 'shrink-0'}
    >
      <span className="opacity-90">{item.icon}</span>
      <span>{item.label}</span>
    </HexButton>
  )
}

function HoneycombNav({ layout = 'auto' }) {
  const { pathname } = useLocation()

  const resolvedLayout = layout === 'auto' ? 'responsive' : layout

  if (resolvedLayout === 'sidebar') {
    return (
      <nav className="flex flex-col items-center gap-2 py-4" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.id} item={item} active={item.match(pathname)} />
        ))}
      </nav>
    )
  }

  return (
    <nav
      className="grid w-full grid-cols-5 items-center justify-items-center gap-0 px-0.5 py-1 md:flex md:justify-center md:gap-2 md:px-2 md:py-2"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map((item) => (
        <NavItem key={item.id} item={item} active={item.match(pathname)} stretch />
      ))}
    </nav>
  )
}

export { NAV_ITEMS }
export default HoneycombNav
