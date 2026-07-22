function HoneyJar({ balance, label = 'Shared balance', status = 'settled', isLoading }) {
  const amount = Number(balance) || 0
  const fillPercent = Math.min(100, Math.max(15, (amount / 10000) * 100 || 30))
  const statusColors = {
    settled: 'from-[var(--honey-300)] to-[var(--honey-500)]',
    owed: 'from-amber-400 to-orange-500',
    owing: 'from-rose-300 to-rose-500',
  }

  if (isLoading) {
    return (
      <div className="hive-card flex h-48 animate-pulse items-center justify-center">
        <div className="h-32 w-24 rounded-b-3xl bg-[var(--honey-100)]" />
      </div>
    )
  }

  return (
    <div className="hive-card relative overflow-hidden p-6">
      <p className="hive-eyebrow">{label}</p>
      <div className="mt-4 flex items-end justify-center gap-6">
        <div className="relative">
          <svg width="100" height="130" viewBox="0 0 100 130" className="drop-shadow-md">
            <defs>
              <clipPath id="jarClip">
                <path d="M25,20 L75,20 L82,45 L82,115 Q82,125 50,125 Q18,125 18,115 L18,45 Z" />
              </clipPath>
              <linearGradient id="honeyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde4a8" />
                <stop offset="100%" stopColor="#f5a623" />
              </linearGradient>
            </defs>
            <rect
              x="18"
              y={125 - fillPercent * 0.9}
              width="64"
              height={fillPercent * 0.9}
              fill="url(#honeyFill)"
              clipPath="url(#jarClip)"
            />
            <path
              d="M25,20 L75,20 L82,45 L82,115 Q82,125 50,125 Q18,125 18,115 L18,45 Z"
              fill="none"
              stroke="var(--honey-600)"
              strokeWidth="2.5"
            />
            <ellipse cx="50" cy="20" rx="25" ry="6" fill="var(--honey-200)" stroke="var(--honey-600)" strokeWidth="2" />
          </svg>
        </div>
        <div>
          <p className={`text-2xl font-bold whitespace-nowrap bg-gradient-to-r sm:text-3xl ${statusColors[status] || statusColors.settled} bg-clip-text text-transparent`}>
            {`₪${amount.toLocaleString('en-IL', { maximumFractionDigits: 0 })}`}
          </p>
          <p className="mt-1 text-sm text-[var(--brown-muted)]">
            {status === 'settled' ? 'All balanced' : status === 'owed' ? 'Partner owes you' : 'You owe partner'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default HoneyJar
