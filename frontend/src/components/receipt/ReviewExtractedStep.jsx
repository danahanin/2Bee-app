import { useState } from 'react'
import { EXPENSE_CATEGORIES } from '../../constants/categories.js'

const LOW_CONFIDENCE = 0.7

function fieldBorderClass(confidence) {
  if (confidence == null || confidence >= LOW_CONFIDENCE) {
    return 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
  }
  return 'border-amber-400 ring-1 ring-amber-200 focus:border-amber-500 focus:ring-amber-200'
}

function formatCategoryLabel(category) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function ReviewExtractedStep({
  extracted,
  fieldConfidence = {},
  ocrRawText = '',
  onUpdateField,
  onUpdateLineItem,
  onAddLineItem,
  onRemoveLineItem,
  errors = [],
}) {
  const [showRawText, setShowRawText] = useState(false)
  const vendor = extracted?.vendor ?? ''
  const amount = extracted?.amount
  const currency = extracted?.currency
  const date = extracted?.date ?? ''
  const category = extracted?.category ?? ''
  const lineItems = Array.isArray(extracted?.lineItems) ? extracted.lineItems : []
  const extractedRawText = extracted?.rawText ?? ''
  const rawText = (ocrRawText || extractedRawText || '').trim()
  const hasLowConfidence = Object.values(fieldConfidence).some((value) => value != null && value < LOW_CONFIDENCE)

  const inputClass = (field) =>
    `w-full rounded-xl border px-4 py-2.5 text-slate-900 outline-none transition focus:ring-2 ${fieldBorderClass(fieldConfidence[field])}`

  return (
    <div className="space-y-4">
      {hasLowConfidence ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Amber fields were guessed with low confidence — please double-check them.
        </p>
      ) : null}

      {errors.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          {errors.map((err) => (
            <p key={err} className="text-sm text-rose-700">
              {err}
            </p>
          ))}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
          Vendor
          {fieldConfidence.vendor != null && fieldConfidence.vendor < LOW_CONFIDENCE ? (
            <span className="text-xs font-normal text-amber-600">low confidence</span>
          ) : null}
        </span>
        <input
          type="text"
          maxLength={200}
          value={vendor}
          onChange={(event) => onUpdateField('vendor', event.target.value)}
          className={inputClass('vendor')}
          placeholder="Store or business name"
        />
        <span className="mt-1 block text-xs text-slate-400">{vendor.length}/200</span>
      </label>

      <label className="block">
        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
          Amount
          {currency ? <span className="text-xs font-normal text-slate-400">{currency}</span> : null}
          {fieldConfidence.amount != null && fieldConfidence.amount < LOW_CONFIDENCE ? (
            <span className="text-xs font-normal text-amber-600">low confidence</span>
          ) : null}
        </span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount == null ? '' : String(amount)}
          onChange={(event) => {
            const next = event.target.value
            onUpdateField('amount', next === '' ? null : Number(next))
          }}
          className={inputClass('amount')}
          placeholder="0.00"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Currency</span>
        <input
          type="text"
          value={currency ?? ''}
          onChange={(event) => onUpdateField('currency', event.target.value || null)}
          className={inputClass('currency')}
          placeholder="Optional currency code"
        />
      </label>

      <label className="block">
        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
          Category
          {fieldConfidence.category != null && fieldConfidence.category < LOW_CONFIDENCE ? (
            <span className="text-xs font-normal text-amber-600">low confidence</span>
          ) : null}
        </span>
        <select
          value={category}
          onChange={(event) => onUpdateField('category', event.target.value)}
          className={inputClass('category')}
        >
          <option value="" disabled>
            Select a category
          </option>
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {formatCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
          Date
          {fieldConfidence.date != null && fieldConfidence.date < LOW_CONFIDENCE ? (
            <span className="text-xs font-normal text-amber-600">low confidence</span>
          ) : null}
        </span>
        <input
          type="date"
          value={date}
          onChange={(event) => onUpdateField('date', event.target.value)}
          className={inputClass('date')}
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
          Line items
          {fieldConfidence.lineItems != null &&
          fieldConfidence.lineItems < LOW_CONFIDENCE &&
          lineItems.length > 0 ? (
            <span className="text-xs font-normal text-amber-600">low confidence</span>
          ) : null}
        </legend>

        {lineItems.length === 0 ? (
          <p className="text-xs text-slate-400">No line items detected.</p>
        ) : (
          lineItems.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item.description ?? ''}
                onChange={(event) => onUpdateLineItem(index, 'description', event.target.value)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 ${fieldBorderClass(fieldConfidence.lineItems)}`}
                placeholder="Item"
                aria-label={`Line item ${index + 1} description`}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.amount == null ? '' : String(item.amount)}
                onChange={(event) => {
                  const next = event.target.value
                  onUpdateLineItem(index, 'amount', next === '' ? null : Number(next))
                }}
                className={`w-24 rounded-xl border px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 ${fieldBorderClass(fieldConfidence.lineItems)}`}
                placeholder="0.00"
                aria-label={`Line item ${index + 1} amount`}
              />
              <button
                type="button"
                onClick={() => onRemoveLineItem(index)}
                className="rounded-lg px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={`Remove line item ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))
        )}

        <button
          type="button"
          onClick={onAddLineItem}
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
          aria-expanded={showRawText}
        >
          <span>Scanned text</span>
          <span className="text-xs text-slate-400">{showRawText ? 'Hide' : 'Show'}</span>
        </button>
        {showRawText ? (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
            {rawText || 'No text detected.'}
          </pre>
        ) : null}
      </div>
    </div>
  )
}

export default ReviewExtractedStep
