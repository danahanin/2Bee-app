function HiveAuthLayout({ title, subtitle, children }) {
  return (
    <main className="hive-auth-page">
      <div className="hive-auth-bg" aria-hidden="true" />
      <section className="hive-auth-card">
        <div className="hive-auth-logo">
          <span className="hive-auth-logo-icon">⬡</span>
          <div>
            <p className="hive-auth-brand">2BEE</p>
            <p className="hive-auth-brand-sub">The Hive</p>
          </div>
        </div>
        <h1 className="hive-auth-title">{title}</h1>
        {subtitle ? <p className="hive-auth-subtitle">{subtitle}</p> : null}
        {children}
      </section>
    </main>
  )
}

export function HiveAuthInput({ label, className = '', ...props }) {
  return (
    <label className="block">
      <span className="hive-auth-label">{label}</span>
      <input className={`hive-auth-input ${className}`.trim()} {...props} />
    </label>
  )
}

export function HiveAuthButton({ children, ...props }) {
  return (
    <button type="submit" className="hive-auth-button" {...props}>
      {children}
    </button>
  )
}

export default HiveAuthLayout
