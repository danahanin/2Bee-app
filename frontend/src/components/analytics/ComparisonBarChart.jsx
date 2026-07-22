import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import useChartSize from './useChartSize.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function ComparisonBarChart({ categories, currentLabel, previousLabel }) {
  const [frameRef, { width, height }] = useChartSize()
  const topCategories = (categories ?? []).slice(0, 8)

  if (!topCategories.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 sm:h-72">
        No comparison data yet.
      </div>
    )
  }

  const chartData = topCategories.map((row) => ({
    category: row.category,
    current: row.current,
    previous: row.previous,
  }))

  return (
    <div ref={frameRef} className="h-56 w-full min-w-0 sm:h-72">
      {width > 0 && height > 0 ? (
        <BarChart
          width={width}
          height={height}
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={56} />
          <YAxis width={48} tickFormatter={(value) => `₪${value}`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="current" name={currentLabel} fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="previous" name={previousLabel} fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : null}
    </div>
  )
}

export default ComparisonBarChart
