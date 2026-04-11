import { useEffect, useState } from 'react'

const CATEGORIES = [
  'groceries',
  'dining',
  'transport',
  'utilities',
  'rent',
  'entertainment',
  'health',
  'shopping',
  'subscriptions',
  'travel',
  'education',
  'other',
]

function toDateInputValue(date) {
  const d = date ? new Date(date) : new Date()
  return d.toISOString().split('T')[0]
}

function ExpenseFormModal({ expense, onSubmit, onClose, isSubmitting }) {
  const isEditing = Boolean(expense)

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(toDateInputValue())
  const [errors, setErrors] = useState([])

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount))
      setCategory(expense.category)
      setDescription(expense.description)
      setDate(toDateInputValue(expense.date))
    }
  }, [expense])

  function validate() {
    const errs = []
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      errs.push('Amount must be a positive number')
    }
    if (!CATEGORIES.includes(category)) {
      errs.push('Please select a valid category')
    }
    if (!description.trim()) {
      errs.push('Description is required')
    } else if (description.length > 200) {
      errs.push('Description must be 200 characters or less')
    }
    if (!date || isNaN(Date.parse(date))) {
      errs.push('Please enter a valid date')
    }
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])
    onSubmit({
      amount: parseFloat(amount),
      category,
      description: description.trim(),
      date,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            {errors.map((err) => (
              <p key={err} className="text-sm text-rose-700">{err}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Amount</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="0.00"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
            <input
              type="text"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="What was this expense for?"
              required
            />
            <span className="mt-1 block text-xs text-slate-400">{description.length}/200</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              required
            />
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpenseFormModal
