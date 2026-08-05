import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { scanReceipt, classifyFromReceipt, confirmReceipt } from '../../services/receiptService.js'
import { EXPENSE_CATEGORIES as CATEGORIES } from '../../constants/categories.js'
import { CURRENCIES, DEFAULT_CURRENCY } from '../../constants/currencies.js'
import ClassificationPanel from './ClassificationPanel.jsx'
import HiveSuggestionPanel from './HiveSuggestionPanel.jsx'
import SuggestionBadge from '../ai/SuggestionBadge.jsx'
import { isFallback, suggestionIcon, suggestionLabel, suggestionTone } from '../../utils/aiSource.js'

const LOW_CONFIDENCE = 0.7

function todayInputValue() {
  return new Date().toISOString().split('T')[0]
}

function toDateInputValue(isoDate) {
  if (!isoDate) return todayInputValue()
  return isoDate.split('T')[0]
}

function fieldBorderClass(confidence) {
  if (confidence == null || confidence >= LOW_CONFIDENCE) {
    return 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
  }
  return 'border-amber-400 ring-1 ring-amber-200 focus:border-amber-500 focus:ring-amber-200'
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
    errs.push('Vendor / description is required')
  } else if (description.length > 200) {
    errs.push('Description must be 200 characters or less')
  }
  if (!date || isNaN(Date.parse(date))) {
    errs.push('Please enter a valid date')
  }
  return errs
}

function applyDraftToForm(result, setters) {
  const ext = result?.extracted || {}
  setters.setAmount(ext.amount != null ? String(ext.amount) : '')
  setters.setCurrency(CURRENCIES.includes(ext.currency) ? ext.currency : DEFAULT_CURRENCY)
  setters.setCategory(ext.category || '')
  setters.setDescription(ext.vendor || '')
  setters.setDate(toDateInputValue(ext.date))
  setters.setLineItems(Array.isArray(ext.lineItems) ? ext.lineItems : [])
  setters.setFieldConfidence(result?.fieldConfidence || {})
  setters.setCategorySuggestion(result?.categorySuggestion || null)
  setters.setHiveSuggestion(result?.hiveSuggestion || null)
  setters.setExpenseGroupId(result?.hiveSuggestion?.expenseGroupId || '')
}

function ScanReceiptModal({ onClose, onSaved }) {
  const { token, hives, activeHiveId } = useAuth()

  const [step, setStep] = useState('picker')
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(null)

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayInputValue)
  const [lineItems, setLineItems] = useState([])
  const [fieldConfidence, setFieldConfidence] = useState({})
  const [errors, setErrors] = useState([])
  const [showRawText, setShowRawText] = useState(false)
  const [classification, setClassification] = useState(null)
  const [overriddenType, setOverriddenType] = useState(null)
  const [selectedHiveId, setSelectedHiveId] = useState(activeHiveId || '')
  const [categorySuggestion, setCategorySuggestion] = useState(null)
  const [hiveSuggestion, setHiveSuggestion] = useState(null)
  const [expenseGroupId, setExpenseGroupId] = useState('')
  const [isClassifying, setIsClassifying] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    if (!selectedHiveId && hives.length > 0) {
      setSelectedHiveId(activeHiveId || hives[0].hiveId)
    }
  }, [activeHiveId, hives, selectedHiveId])

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setStep('loading')
    try {
      const result = await scanReceipt(token, file)
      setDraft(result)
      setClassification(result.classification || null)
      setOverriddenType(null)
      applyDraftToForm(result, {
        setAmount,
        setCurrency,
        setCategory,
        setDescription,
        setDate,
        setLineItems,
        setFieldConfidence,
        setCategorySuggestion,
        setHiveSuggestion,
        setExpenseGroupId,
      })
      setStep('review')
    } catch (err) {
      setError(err.message)
      setStep('picker')
    }
  }

  function updateLineItem(index, field, value) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  function removeLineItem(index) {
    setLineItems((items) => items.filter((_, i) => i !== index))
  }

  function addLineItem() {
    setLineItems((items) => [...items, { description: '', amount: '' }])
  }

  async function handleContinueToClassify(event) {
    event.preventDefault()
    const errs = validateForm({ amount, category, description, date })
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])
    setIsClassifying(true)
    setError(null)

    try {
      const parsedLineItems = lineItems
        .filter((item) => item.description?.trim())
        .map((item) => ({
          description: item.description.trim(),
          amount: parseFloat(item.amount) || 0,
        }))

      const result = await classifyFromReceipt(token, {
        vendor: description.trim(),
        amount: parseFloat(amount),
        category,
        date,
        currency,
        lineItems: parsedLineItems,
        rawText: draft?.ocr?.rawText || draft?.extracted?.rawText || '',
      })

      setClassification(result)
      setOverriddenType(null)
      setStep('classify')
    } catch (err) {
      setClassification(draft?.classification || null)
      setStep('classify')
      setError(err.message)
    } finally {
      setIsClassifying(false)
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    const effectiveType = overriddenType ?? classification?.type ?? 'personal'

    const errs = validateForm({ amount, category, description, date })
    if (effectiveType === 'shared' && !selectedHiveId) {
      errs.push('Choose a hive before saving this shared expense')
    }
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])

    setIsConfirming(true)
    try {
      await confirmReceipt(token, {
        receiptId: draft?.receiptId || null,
        type: effectiveType,
        hiveId: effectiveType === 'shared' ? selectedHiveId : null,
        expenseGroupId: effectiveType === 'shared' ? expenseGroupId || null : null,
        classifiedBy: overriddenType ? 'user' : 'ai',
        extracted: {
          vendor: description.trim(),
          amount: parseFloat(amount),
          category,
          date,
          currency,
          lineItems,
          rawText: draft?.ocr?.rawText || draft?.extracted?.rawText || '',
        },
        expense: {
          amount: parseFloat(amount),
          currency,
          category,
          description: description.trim(),
          date,
        },
      })
      onSaved?.()
      onClose()
    } catch (err) {
      setErrors([err.message])
    } finally {
      setIsConfirming(false)
    }
  }

  const inputClass = (field) =>
    `w-full rounded-xl border px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 ${fieldBorderClass(fieldConfidence[field])}`

  return (
    <div className="hive-modal-backdrop" onClick={onClose}>
      <div
        className="hive-modal-panel max-w-full sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
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
          <form onSubmit={handleContinueToClassify} className="space-y-4">
            {Object.values(fieldConfidence).some((c) => c != null && c < LOW_CONFIDENCE) && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Amber fields were guessed with low confidence — please double-check them.
              </p>
            )}

            {errors.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                {errors.map((err) => (
                  <p key={err} className="text-sm text-rose-700">{err}</p>
                ))}
              </div>
            )}

            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                Vendor
                {fieldConfidence.vendor != null && fieldConfidence.vendor < LOW_CONFIDENCE && (
                  <span className="text-xs font-normal text-amber-600">low confidence</span>
                )}
              </span>
              <input
                type="text"
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass('vendor')}
                placeholder="Store or business name"
              />
              <span className="mt-1 block text-xs text-slate-400">{description.length}/200</span>
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                Amount
                {fieldConfidence.amount != null && fieldConfidence.amount < LOW_CONFIDENCE && (
                  <span className="text-xs font-normal text-amber-600">low confidence</span>
                )}
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass('amount')}
                  placeholder="0.00"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  aria-label="Currency"
                  className="w-24 shrink-0 rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                Category
                {fieldConfidence.category != null && fieldConfidence.category < LOW_CONFIDENCE && (
                  <span className="text-xs font-normal text-amber-600">low confidence</span>
                )}
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass('category')}
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
              {categorySuggestion && categorySuggestion.value !== category && (
                <div className="mt-2 space-y-1.5">
                  <SuggestionBadge
                    label={suggestionLabel(categorySuggestion.source, categorySuggestion.value)}
                    confidence={categorySuggestion.confidence}
                    icon={suggestionIcon(categorySuggestion.source)}
                    tone={suggestionTone(categorySuggestion.source)}
                    onApply={() => setCategory(categorySuggestion.value)}
                  />
                  {isFallback(categorySuggestion.source) && (
                    <p className="text-xs text-amber-700">
                      The AI model was unavailable, so this suggestion comes from simple rules instead.
                    </p>
                  )}
                </div>
              )}
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                Date
                {fieldConfidence.date != null && fieldConfidence.date < LOW_CONFIDENCE && (
                  <span className="text-xs font-normal text-amber-600">low confidence</span>
                )}
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass('date')}
              />
            </label>

            <fieldset className="space-y-2">
              <legend className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                Line items
                {fieldConfidence.lineItems != null && fieldConfidence.lineItems < LOW_CONFIDENCE && lineItems.length > 0 && (
                  <span className="text-xs font-normal text-amber-600">low confidence</span>
                )}
              </legend>
              {lineItems.length === 0 ? (
                <p className="text-xs text-slate-400">No line items detected.</p>
              ) : (
                lineItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 ${fieldBorderClass(fieldConfidence.lineItems)}`}
                      placeholder="Item"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount}
                      onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                      className={`w-24 rounded-xl border px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 ${fieldBorderClass(fieldConfidence.lineItems)}`}
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="rounded-lg px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Remove line item"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={addLineItem}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
              >
                + Add line item
              </button>
            </fieldset>

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
                  {draft?.ocr?.rawText?.trim() || draft?.extracted?.rawText?.trim() || 'No text detected.'}
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
                disabled={isClassifying}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isClassifying ? 'Classifying…' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {step === 'classify' && (
          <form onSubmit={handleSave} className="space-y-4">
            {errors.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                {errors.map((err) => (
                  <p key={err} className="text-sm text-rose-700">{err}</p>
                ))}
              </div>
            )}

            <ClassificationPanel
              classification={classification}
              overriddenType={overriddenType}
              onOverride={setOverriddenType}
            />

            {(overriddenType ?? classification?.type) === 'shared' && (
              <>
                <label className="block rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">Save to hive</span>
                  <select
                    value={selectedHiveId}
                    onChange={(event) => setSelectedHiveId(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="" disabled>
                      Choose a hive
                    </option>
                    {hives.map((hive) => (
                      <option key={hive.hiveId} value={hive.hiveId}>
                        {hive.name || hive.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs text-slate-500">
                    This receipt will be added to the selected hive’s shared expenses.
                  </span>
                </label>

                {(hiveSuggestion?.expenseGroupId || hiveSuggestion?.alternatives?.length > 0) && (
                  <HiveSuggestionPanel
                    suggestion={hiveSuggestion}
                    selectedGroupId={expenseGroupId}
                    onSelect={setExpenseGroupId}
                  />
                )}
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('review')}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isConfirming}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isConfirming ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ScanReceiptModal
