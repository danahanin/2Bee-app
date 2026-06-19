import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { colorForCategory } from '../../utils/categoryColors.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function TrendLineChart({ months, series }) {
  if (!series?.length || !months?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        No trend data for this range.
      </div>
    )
  }

  const topSeries = series.slice(0, 5)
  const chartData = months.map((month, monthIndex) => {
    const row = { month }
    topSeries.forEach((entry) => {
      row[entry.category] = entry.data[monthIndex] ?? 0
    })
    return row
  })

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value) => `₪${value}`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
          {topSeries.map((entry, index) => (
            <Line
              key={entry.category}
              type="monotone"
              dataKey={entry.category}
              stroke={colorForCategory(entry.category, index)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TrendLineChart
