import Hexagon from './Hexagon.jsx'

function MetricCell({ label, value, subtitle, trend }) {
  return (
    <article className="hive-card relative flex flex-col items-center p-5 text-center">
      <div className="mb-3 opacity-80">
        <Hexagon size={56} variant="glow" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brown-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--brown-text)]">{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-[var(--brown-muted)]">{subtitle}</p> : null}
      {trend ? (
        <p
          className={`mt-2 text-xs font-semibold ${trend.positive ? 'text-emerald-700' : 'text-rose-700'}`}
        >
          {trend.label}
        </p>
      ) : null}
    </article>
  )
}

export default MetricCell
