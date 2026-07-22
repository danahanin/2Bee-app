import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts'
import { colorForCategory } from '../../utils/categoryColors.js'
import useChartSize from './useChartSize.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function SpendingPieChart({ breakdown, total }) {
  const [frameRef, { width, height }] = useChartSize()

  if (!breakdown?.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 sm:h-72">
        No spending in this range.
      </div>
    )
  }

  const chartData = breakdown.map((row, index) => ({
    name: row.category,
    value: row.amount,
    fill: colorForCategory(row.category, index),
  }))

  return (
    <div className="w-full min-w-0">
      <div ref={frameRef} className="h-56 w-full sm:h-72">
        {width > 0 && height > 0 ? (
          <PieChart width={width} height={height}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={Math.max(28, Math.round(Math.min(width, height) * 0.18))}
              outerRadius={Math.max(48, Math.round(Math.min(width, height) * 0.32))}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        ) : null}
      </div>
      <p className="mt-2 text-center text-sm text-slate-600">Total: {formatCurrency(total)}</p>
    </div>
  )
}

export default SpendingPieChart
