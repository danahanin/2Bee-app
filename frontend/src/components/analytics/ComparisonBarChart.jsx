import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function ComparisonBarChart({ categories, currentLabel, previousLabel }) {
  const topCategories = (categories ?? []).slice(0, 8)

  if (!topCategories.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
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
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(value) => `₪${value}`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
          <Bar dataKey="current" name={currentLabel} fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="previous" name={previousLabel} fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ComparisonBarChart
