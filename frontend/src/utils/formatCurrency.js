import { CURRENCY_SYMBOLS } from '../constants/currencies.js'

export function formatCurrency(value, options = {}) {
  const amount = Number(value) || 0
  const { maximumFractionDigits = 2, minimumFractionDigits, currency = 'ILS' } = options
  const digits =
    minimumFractionDigits != null
      ? minimumFractionDigits
      : Number.isInteger(amount)
        ? 0
        : Math.min(2, maximumFractionDigits)

  const symbol = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.ILS

  return `${symbol}${amount.toLocaleString('en-IL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, maximumFractionDigits),
  })}`
}
