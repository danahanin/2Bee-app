function HivePanel({ title, subtitle, children, action, className = '' }) {
  return (
    <section className={`hive-card overflow-hidden ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-[rgba(61,41,20,0.08)] bg-gradient-to-r from-[var(--honey-50)] to-[var(--honey-100)] px-5 py-4">
        <div>
          {title ? <h2 className="hive-title text-base">{title}</h2> : null}
          {subtitle ? <p className="mt-0.5 text-sm text-[var(--brown-muted)]">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export default HivePanel
