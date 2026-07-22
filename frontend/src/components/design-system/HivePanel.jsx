function HivePanel({ title, subtitle, children, action, className = '' }) {
  return (
    <section className={`hive-card min-w-0 max-w-full overflow-hidden ${className}`}>
      <header className="flex flex-col gap-3 border-b border-[rgba(61,41,20,0.08)] bg-gradient-to-r from-[var(--honey-50)] to-[var(--honey-100)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5 sm:py-4">
        <div className="min-w-0">
          {title ? <h2 className="hive-title text-base">{title}</h2> : null}
          {subtitle ? <p className="mt-0.5 text-sm text-[var(--brown-muted)]">{subtitle}</p> : null}
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </header>
      <div className="min-w-0 p-3 sm:p-5">{children}</div>
    </section>
  )
}

export default HivePanel
