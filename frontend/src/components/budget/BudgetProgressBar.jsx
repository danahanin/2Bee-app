function barColor(percentUsed) {
  if (percentUsed >= 100) return 'bg-rose-500'
  if (percentUsed >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function BudgetProgressBar({ percentUsed = 0 }) {
  const safePercent = Math.max(0, Math.min(100, Number(percentUsed) || 0))

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${barColor(safePercent)}`}
        style={{ width: `${safePercent}%` }}
      />
    </div>
  )
}

export default BudgetProgressBar
