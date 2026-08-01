import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { classifyExpense } from '../../services/aiService.js'
import SuggestionBadge from '../ai/SuggestionBadge.jsx'
import { EXPENSE_CATEGORIES as CATEGORIES } from '../../constants/categories.js'

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
  const [appliedFromAi, setAppliedFromAi] = useState(false)
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
      const hiveId = destination !== 'personal' ? destination : undefined
      const result = await classifyExpense({
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        date,
        hiveId,
      })
      setSuggestion(result)
      setAppliedFromAi(false)
    } catch (err) {
      setErrors([err.message || 'AI classification failed'])
    } finally {
      setIsSuggesting(false)
    }
  }

  function applyCategorySuggestion() {
    if (!suggestion?.category?.value) return
    setCategory(suggestion.category.value)
    setAppliedFromAi(true)
  }

  function applyTypeSuggestion() {
    if (!suggestion?.personalOrShared) return
    setAppliedFromAi(true)
    if (suggestion.personalOrShared.value === 'personal') {
      setDestination('personal')
      return
    }
    // "Shared" only tells us it belongs to a hive, not which one when the user has
    // several — keep the current hive selection if there is one, else default to the first.
    setDestination((current) => (current !== 'personal' ? current : hives[0]?.hiveId || 'personal'))
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
        classifiedBy: appliedFromAi ? 'ai' : 'user',
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
            {suggestion?.category && suggestion.category.value !== category && (
              <div className="mt-2">
                <SuggestionBadge
                  label={`AI suggests: ${suggestion.category.value}`}
                  confidence={suggestion.category.confidence}
                  onApply={applyCategorySuggestion}
                />
              </div>
            )}
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

          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--honey-300)] bg-[var(--honey-50)] px-3 py-2.5">
            <p className="text-xs text-[var(--brown-muted)]">
              ✨ Let AI suggest a category and whether this is personal or shared, based on what you entered above.
            </p>
            <button
              type="button"
              onClick={handleSuggest}
              disabled={isSuggesting}
              className="shrink-0 rounded-lg bg-[var(--honey-400)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {isSuggesting ? 'Asking AI...' : 'Suggest with AI'}
            </button>
          </div>

          <div className="rounded-xl border border-[rgba(61,41,20,0.1)] bg-[var(--honey-50)] p-3">
            <span className="mb-2 block text-sm font-medium text-[var(--brown-text)]">Assign to</span>
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
            {suggestion?.personalOrShared ? (
              <div className="mt-2 space-y-2">
                <SuggestionBadge
                  label={`AI suggests: ${suggestion.personalOrShared.value}`}
                  confidence={suggestion.personalOrShared.confidence}
                  tone={suggestion.personalOrShared.value}
                  onApply={applyTypeSuggestion}
                />
                {suggestion.personalOrShared.reasoning && (
                  <p className="text-xs text-[var(--brown-muted)]">{suggestion.personalOrShared.reasoning}</p>
                )}
                {suggestion.hive?.groupName && (
                  <p className="text-xs text-[var(--brown-muted)]">
                    Likely hive group: <span className="font-semibold">{suggestion.hive.groupName}</span>
                    {suggestion.hive.confidence != null ? ` (${Math.round(suggestion.hive.confidence * 100)}%)` : ''}
                  </p>
                )}
              </div>
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
