function clampFill(value) {
  return Math.min(100, Math.max(6, value))
}

function HoneyJar({ label, value, fillPercent = 72, sublabel, size = 'md', icon, className = '' }) {
  const fill = clampFill(fillPercent)

  return (
    <article className={`honey-jar honey-jar-${size} ${className}`.trim()} title={sublabel || label}>
      <div className="honey-jar-vessel" aria-hidden="true">
        <div className="honey-jar-lid" />
        <div className="honey-jar-neck" />
        <div className="honey-jar-glass">
          <div className="honey-jar-fill" style={{ height: `${fill}%` }}>
            <div className="honey-jar-shine" />
          </div>
          {icon ? <span className="honey-jar-float-icon">{icon}</span> : null}
        </div>
      </div>
      {value ? <p className="honey-jar-value">{value}</p> : null}
      <p className="honey-jar-label">{label}</p>
      {sublabel ? <p className="honey-jar-sub">{sublabel}</p> : null}
    </article>
  )
}

export function HoneyJarRow({ children, className = '' }) {
  return <div className={`honey-jar-row ${className}`.trim()}>{children}</div>
}

export function HoneyJarGrid({ children, className = '' }) {
  return <div className={`honey-jar-grid ${className}`.trim()}>{children}</div>
}

export default HoneyJar
