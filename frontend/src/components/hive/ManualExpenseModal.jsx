import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { classifyFromReceipt } from '../../services/receiptService.js'

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

function ManualExpenseModal({ onClose, onSaved }) {
  const { token } = useAuth()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => toDateInputValue())
  const [destination, setDestination] = useState('personal')
  const [hives, setHives] = useState([])
  const [suggestion, setSuggestion] = useState(null)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    let mounted = true
    fetch('/hive', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : { hives: [] }))
      .then((data) => {
        if (mounted) setHives(data.hives || [])
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [token])

  function validate() {
    const errs = []
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) errs.push('Amount must be a positive number')
    if (!CATEGORIES.includes(category)) errs.push('Please select a valid category')
    if (!description.trim()) errs.push('Description is required')
    else if (description.length > 200) errs.push('Description must be 200 characters or less')
    if (!date || isNaN(Date.parse(date))) errs.push('Please enter a valid date')
    return errs
  }

  async function handleSuggest() {
    if (!description.trim() || !amount) {
      setErrors(['Enter amount and description before asking AI'])
      return
    }
    setErrors([])
    setIsSuggesting(true)
    try {
      const result = await classifyFromReceipt(token, {
        vendor: description.trim(),
        amount: parseFloat(amount),
        category,
        date,
        rawText: description.trim(),
      })
      setSuggestion(result)
      if (result.type === 'shared' && hives.length > 0) {
        setDestination(hives[0].hiveId)
      } else {
        setDestination('personal')
      }
    } catch (err) {
      setErrors([err.message || 'AI classification failed'])
    } finally {
      setIsSuggesting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])
    setIsSubmitting(true)
    try {
      const payload = {
        amount: parseFloat(amount),
        category,
        description: description.trim(),
        date,
        classifiedBy: suggestion ? 'ai' : 'user',
      }
      const url = destination === 'personal' ? '/expenses' : `/hive/${destination}/expenses`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || 'Failed to create expense')
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setErrors([err.message])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="hive-modal-backdrop" onClick={onClose}>
      <div className="hive-modal-panel max-w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--brown-text)]">Add expense</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[var(--brown-muted)] hover:text-[var(--brown-text)]"
          >
            Close
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            {errors.map((err) => (
              <p key={err} className="text-sm text-rose-700">
                {err}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Amount</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-[rgba(61,41,20,0.15)] px-4 py-2.5 outline-none focus:border-[var(--honey-500)]"
              placeholder="0.00"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-[rgba(61,41,20,0.15)] px-4 py-2.5 outline-none focus:border-[var(--honey-500)]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Description</span>
            <input
              type="text"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[rgba(61,41,20,0.15)] px-4 py-2.5 outline-none focus:border-[var(--honey-500)]"
              placeholder="What was this expense for?"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--brown-text)]">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[rgba(61,41,20,0.15)] px-4 py-2.5 outline-none focus:border-[var(--honey-500)]"
              required
            />
          </label>

          <div className="rounded-xl border border-[rgba(61,41,20,0.1)] bg-[var(--honey-50)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--brown-text)]">Assign to</span>
              <button
                type="button"
                onClick={handleSuggest}
                disabled={isSuggesting}
                className="rounded-lg bg-[var(--honey-400)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
              >
                {isSuggesting ? 'Asking AI...' : 'Suggest with AI'}
              </button>
            </div>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl border border-[rgba(61,41,20,0.15)] bg-white px-4 py-2.5 outline-none focus:border-[var(--honey-500)]"
            >
              <option value="personal">Personal</option>
              {hives.map((hive) => (
                <option key={hive.hiveId} value={hive.hiveId}>
                  {hive.label}
                </option>
              ))}
            </select>
            {suggestion ? (
              <p className="mt-2 text-xs text-[var(--brown-muted)]">
                AI suggests: <span className="font-semibold">{suggestion.type}</span>
                {suggestion.confidence != null ? ` (${Math.round(suggestion.confidence * 100)}% confident)` : ''}
              </p>
            ) : null}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[rgba(61,41,20,0.15)] px-4 py-2.5 text-sm font-semibold text-[var(--brown-text)] hover:bg-[var(--honey-50)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="hive-btn-primary flex-1 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ManualExpenseModal
