import { useCurrency } from '../../context/CurrencyContext.jsx'
import { CURRENCIES, CURRENCY_SYMBOLS } from '../../constants/currencies.js'

function CurrencySettings({ onStatusMessage }) {
  const { displayCurrency, updateDisplayCurrency, saving } = useCurrency()

  async function handleChange(event) {
    const next = event.target.value
    const result = await updateDisplayCurrency(next)
    if (!result.ok) {
      onStatusMessage?.({ type: 'error', text: result.message || 'Failed to update currency.' })
      return
    }
    onStatusMessage?.({
      type: 'success',
      text: `Display currency updated to ${result.displayCurrency || next}.`,
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-slate-900">Display currency</h3>
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-700"
          title="Every total, budget, and chart is converted into this currency. Individual expenses still show what you actually paid."
        >
          i
        </span>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm text-slate-700">Show totals in</span>
        <select
          value={displayCurrency}
          disabled={saving}
          onChange={handleChange}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_SYMBOLS[code]} {code}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}

export default CurrencySettings
