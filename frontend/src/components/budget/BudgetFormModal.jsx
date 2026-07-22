import { useState } from 'react'
import { BUDGET_PERIODS, EXPENSE_CATEGORIES } from '../../constants/categories.js'

function BudgetFormModal({ budget, budgetType, onSubmit, onClose, isSubmitting }) {
  const isEditing = Boolean(budget)

  const [category, setCategory] = useState(() => budget?.category || EXPENSE_CATEGORIES[0])
  const [limit, setLimit] = useState(() => (budget ? String(budget.limit) : ''))
  const [period, setPeriod] = useState(() => budget?.period || 'monthly')
  const [errors, setErrors] = useState([])

  function validate() {
    const errs = []
    const parsed = parseFloat(limit)
    if (!limit || Number.isNaN(parsed) || parsed <= 0) {
      errs.push('Limit must be a positive number')
    }
    if (!EXPENSE_CATEGORIES.includes(category)) {
      errs.push('Please select a valid category')
    }
    if (!BUDGET_PERIODS.includes(period)) {
      errs.push('Please select a valid period')
    }
    return errs
  }

  function handleSubmit(event) {
    event.preventDefault()
    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])
    onSubmit({
      category,
      limit: parseFloat(limit),
      period,
      type: budgetType,
    })
  }

  return (
    <div className="hive-modal-backdrop" onClick={onClose}>
      <div
        className="hive-modal-panel max-w-full sm:max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Edit Budget' : 'Add Budget'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {errors.length > 0 ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            {errors.map((err) => (
              <p key={err} className="text-sm text-rose-700">
                {err}
              </p>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={isEditing}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50"
            >
              {EXPENSE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Limit (ILS)</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Period</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              {BUDGET_PERIODS.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-slate-500 capitalize">{budgetType} budget</p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BudgetFormModal
