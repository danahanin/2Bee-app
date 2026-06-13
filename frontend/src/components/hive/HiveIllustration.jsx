function HiveIllustration({ variant = 'sidebar', fillRatio = 0.75 }) {
  const ratio = Math.min(1, Math.max(0, fillRatio))
  const filledCount = Math.round(ratio * 7)

  const cells = Array.from({ length: 7 }, (_, index) => ({
    filled: index < filledCount,
    delay: index,
  }))

  return (
    <div className={`hive-illustration hive-illustration-${variant}`} aria-hidden="true">
      <div className="hive-illustration-glow" />
      <div className="hive-illustration-comb">
        {cells.map((cell, index) => (
          <div
            key={index}
            className={`hive-illustration-cell ${cell.filled ? 'hive-illustration-cell-filled' : ''}`}
            style={{ animationDelay: `${cell.delay * 0.15}s` }}
          />
        ))}
      </div>
      <div className="hive-illustration-bees">
        <span className="hive-illustration-bee hive-illustration-bee-1">🐝</span>
        <span className="hive-illustration-bee hive-illustration-bee-2">🐝</span>
      </div>
    </div>
  )
}

export default HiveIllustration
