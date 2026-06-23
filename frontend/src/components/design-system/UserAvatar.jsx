const SIZES = {
  xs: { outer: 28, text: 'text-[10px]' },
  sm: { outer: 36, text: 'text-xs' },
  md: { outer: 48, text: 'text-sm' },
  lg: { outer: 64, text: 'text-lg' },
  xl: { outer: 80, text: 'text-2xl' },
}

function getInitials(user) {
  const first = user?.firstName?.[0] || ''
  const last = user?.lastName?.[0] || ''
  const fromName = `${first}${last}`.toUpperCase()
  if (fromName) return fromName
  if (user?.name) return user.name[0]?.toUpperCase() || '?'
  return '?'
}

function UserAvatar({ user, size = 'md', showHexFrame = true, className = '' }) {
  const dims = SIZES[size] || SIZES.md
  const initials = getInitials(user)
  const src = user?.avatarUrl || null

  const inner = src ? (
    <img
      src={src}
      alt={user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
      className="h-full w-full object-cover"
    />
  ) : (
    <span className={`font-bold text-[var(--honey-800)] ${dims.text}`}>{initials}</span>
  )

  if (showHexFrame) {
    return (
      <div
        className={`clip-hex flex shrink-0 items-center justify-center overflow-hidden bg-[var(--honey-100)] ${className}`}
        style={{ width: dims.outer * 0.87, height: dims.outer }}
      >
        {inner}
      </div>
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--honey-100)] ${className}`}
      style={{ width: dims.outer, height: dims.outer }}
    >
      {inner}
    </div>
  )
}

export default UserAvatar
