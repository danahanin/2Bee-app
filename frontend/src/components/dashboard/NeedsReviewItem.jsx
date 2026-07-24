import { useState } from 'react'
import { EXPENSE_CATEGORIES as CATEGORIES } from '../../constants/categories.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import SuggestionBadge from '../ai/SuggestionBadge.jsx'

function buildCorrections(expense, { category, type }) {
  const corrections = {}
  if (category !== expense.category) corrections.category = category
  if (type !== expense.type) corrections.type = type
  return corrections
}

function NeedsReviewItem({ expense, onResolve }) {
  const [category, setCategory] = useState(expense.category)
  const [type, setType] = useState(expense.type)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const suggestion = expense.aiSuggestion || {}

  async function handleConfirm() {
    setIsSaving(true)
    setError(null)
    try {
      await onResolve(expense._id, buildCorrections(expense, { category, type }))
    } catch (err) {
      setError(err.message || 'Failed to update expense')
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-[rgba(61,41,20,0.1)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--brown-text)]">{expense.description}</p>
          <p className="mt-0.5 text-xs text-[var(--brown-muted)]">
            {formatCurrency(expense.amount)} · {new Date(expense.date).toLocaleDateString()}
          </p>
        </div>
        <SuggestionBadge
          label={`AI: ${suggestion.type?.value || expense.type}`}
          confidence={suggestion.type?.confidence}
          tone={expense.type}
        />
      </div>

      {suggestion.type?.reasoning && (
        <p className="mt-2 text-xs text-[var(--brown-muted)]">{suggestion.type.reasoning}</p>
      )}
      {suggestion.hive?.groupName && (
        <p className="mt-1 text-xs text-[var(--brown-muted)]">
          Likely hive group: <span className="font-semibold">{suggestion.hive.groupName}</span>
        </p>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-[var(--brown-text)]">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-[rgba(61,41,20,0.15)] px-2 py-1.5 text-sm"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs">
          <span className="mb-1 block font-medium text-[var(--brown-text)]">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-[rgba(61,41,20,0.15)] px-2 py-1.5 text-sm"
          >
            <option value="personal">Personal</option>
            <option value="shared">Shared</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isSaving}
        className="hive-btn-primary mt-3 w-full rounded-lg px-3 py-1.5 text-xs disabled:opacity-60"
      >
        {isSaving ? 'Saving…' : 'Confirm'}
      </button>
    </div>
  )
}

export default NeedsReviewItem
