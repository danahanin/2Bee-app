import { useState } from 'react'
import { useHiveChamber } from '../../context/HiveChamberContext.jsx'
import HiveButton from './primitives/HiveButton.jsx'
import HiveInput from './primitives/HiveInput.jsx'

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
  const { meta } = useHiveChamber()
  const isEditing = Boolean(expense)

  const [amount, setAmount] = useState(() => (expense ? String(expense.amount) : ''))
  const [category, setCategory] = useState(() => expense?.category || CATEGORIES[0])
  const [description, setDescription] = useState(() => expense?.description || '')
  const [date, setDate] = useState(() => toDateInputValue(expense?.date))
  const [errors, setErrors] = useState([])

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
    <div className="hive-modal-overlay" onClick={onClose}>
      <div className="hive-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="hive-modal-hex-cap" aria-hidden="true" />
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="hive-modal-zone">{meta.zone}</p>
            <h2 className="hive-modal-title">
              {isEditing ? meta.copy.editExpense : meta.copy.addExpense}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="hive-modal-close" aria-label="Close">
            ✕
          </button>
        </div>

        {errors.length > 0 && (
          <div className="hive-alert hive-alert-error mb-4">
            {errors.map((err) => (
              <p key={err}>{err}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <HiveInput
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />

          <HiveInput
            label="Category"
            as="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </HiveInput>

          <HiveInput
            label="Description"
            type="text"
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this expense for?"
            hint={`${description.length}/200`}
            required
          />

          <HiveInput
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div className="flex gap-3 pt-2">
            <HiveButton type="button" variant="secondary" className="flex-1" onClick={onClose}>
              {meta.copy.cancel}
            </HiveButton>
            <HiveButton type="submit" className="flex-1" disabled={isSubmitting}>
              {isEditing ? 'Update' : meta.copy.save}
            </HiveButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpenseFormModal
