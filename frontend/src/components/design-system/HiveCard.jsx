function HiveCard({ children, className = '', accent = false, onClick, as: Tag = 'div' }) {
  return (
    <Tag
      className={`hive-card relative p-5 ${accent ? 'border-[var(--honey-300)] ring-1 ring-[var(--honey-200)]' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {accent ? (
        <div className="pointer-events-none absolute -right-2 -top-2 h-6 w-7 clip-hex bg-[var(--honey-300)] opacity-60" />
      ) : null}
      {children}
    </Tag>
  )
}

export default HiveCard
