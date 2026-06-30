import { useState } from 'react'
import { EXPENSE_CATEGORIES } from '../../constants/categories.js'

function defaultDeadline() {
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() + 6)
  return date.toISOString().split('T')[0]
}

function GoalFormModal({ initialValues, onSubmit, onClose, isSubmitting }) {
  const [title, setTitle] = useState(() => initialValues?.title || '')
  const [targetAmount, setTargetAmount] = useState(() =>
    initialValues?.targetAmount != null ? String(initialValues.targetAmount) : '',
  )
  const [currentAmount, setCurrentAmount] = useState(() =>
    initialValues?.currentAmount != null ? String(initialValues.currentAmount) : '0',
  )
  const [deadline, setDeadline] = useState(() => {
    if (initialValues?.deadline) {
      return new Date(initialValues.deadline).toISOString().split('T')[0]
    }
    return defaultDeadline()
  })
  const [category, setCategory] = useState(() => initialValues?.category || '')
  const [errors, setErrors] = useState([])

  function validate() {
    const errs = []
    if (!title.trim()) errs.push('Title is required')
    const target = parseFloat(targetAmount)
    if (!targetAmount || Number.isNaN(target) || target <= 0) {
      errs.push('Target amount must be a positive number')
    }
    const current = parseFloat(currentAmount)
    if (Number.isNaN(current) || current < 0) {
      errs.push('Current amount must be zero or greater')
    }
    if (!deadline || Number.isNaN(Date.parse(deadline))) {
      errs.push('Please enter a valid deadline')
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
      title: title.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) || 0,
      deadline: new Date(`${deadline}T12:00:00.000Z`).toISOString(),
      category: category || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add Goal</h2>
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
            <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
            <input
              type="text"
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Target amount (ILS)</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Saved so far (ILS)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={currentAmount}
              onChange={(event) => setCurrentAmount(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Deadline</span>
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Category (optional)</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">None</option>
              {EXPENSE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </label>

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
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GoalFormModal
