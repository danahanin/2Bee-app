import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { colorForCategory } from '../../utils/categoryColors.js'
import useChartSize from './useChartSize.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function TrendLineChart({ months, series }) {
  const [frameRef, { width, height }] = useChartSize()

  if (!series?.length || !months?.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 sm:h-72">
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
    <div ref={frameRef} className="h-56 w-full min-w-0 sm:h-72">
      {width > 0 && height > 0 ? (
        <LineChart
          width={width}
          height={height}
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis width={48} tickFormatter={(value) => `₪${value}`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
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
      ) : null}
    </div>
  )
}

export default TrendLineChart
