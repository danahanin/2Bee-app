const SIZE_MAP = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

function getInitials(firstName, lastName, name) {
  if (firstName || lastName) {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'
  }
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return parts[0]?.[0]?.toUpperCase() || '?'
  }
  return '?'
}

function Avatar({ avatarUrl, firstName, lastName, name, size = 'md', className = '', showRing = true }) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md
  const initials = getInitials(firstName, lastName, name)
  const ringClass = showRing ? 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-[#fef9ee]' : ''

  return (
    <div
      className={`hex-clip relative shrink-0 overflow-hidden bg-gradient-to-br from-amber-200 to-amber-400 ${sizeClass} ${ringClass} ${className}`}
      title={name || `${firstName || ''} ${lastName || ''}`.trim()}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold text-amber-900">{initials}</span>
      )}
    </div>
  )
}

export default Avatar
