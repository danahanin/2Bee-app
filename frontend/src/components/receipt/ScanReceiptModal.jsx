import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCreatePersonalExpense } from '../../hooks/useHive.js'
import { scanReceipt } from '../../services/receiptService.js'

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

function todayInputValue() {
  return new Date().toISOString().split('T')[0]
}

function validateForm({ amount, category, description, date }) {
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

function ScanReceiptModal({ onClose, onSaved }) {
  const { token } = useAuth()
  const { create, isSubmitting } = useCreatePersonalExpense()

  const [step, setStep] = useState('picker')
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(null)

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayInputValue)
  const [errors, setErrors] = useState([])
  const [showRawText, setShowRawText] = useState(false)

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setStep('loading')
    try {
      const result = await scanReceipt(token, file)
      setDraft(result)
      setStep('review')
    } catch (err) {
      setError(err.message)
      setStep('picker')
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    const errs = validateForm({ amount, category, description, date })
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])

    const result = await create({
      amount: parseFloat(amount),
      category,
      description: description.trim(),
      date,
      receiptId: draft?.receiptId || null,
    })

    if (result.ok) {
      onSaved?.()
      onClose()
    } else {
      setErrors([result.message])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Scan receipt</h2>
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

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {step === 'picker' && (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50">
            <span className="text-sm font-semibold text-slate-700">Take a photo or choose an image</span>
            <span className="text-xs text-slate-400">We will read the text and let you review it before saving</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </label>
        )}

        {step === 'loading' && (
          <div className="py-10 text-center">
            <p className="mb-3 text-sm font-medium text-slate-700">Reading your receipt…</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
            </div>
          </div>
        )}

        {step === 'review' && (
          <form onSubmit={handleSave} className="space-y-4">
            {errors.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                {errors.map((err) => (
                  <p key={err} className="text-sm text-rose-700">{err}</p>
                ))}
              </div>
            )}

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
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="" disabled>
                  Select a category
                </option>
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
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowRawText((value) => !value)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-600"
              >
                <span>Scanned text</span>
                <span className="text-xs text-slate-400">{showRawText ? 'Hide' : 'Show'}</span>
              </button>
              {showRawText && (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
                  {draft?.ocr?.rawText?.trim() || 'No text detected.'}
                </pre>
              )}
            </div>

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
                Save expense
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ScanReceiptModal
