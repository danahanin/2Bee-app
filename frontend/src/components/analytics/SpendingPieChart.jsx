import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { colorForCategory } from '../../utils/categoryColors.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function SpendingPieChart({ breakdown, total }) {
  if (!breakdown?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
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
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-sm text-slate-600">Total: {formatCurrency(total)}</p>
    </div>
  )
}

export default SpendingPieChart
