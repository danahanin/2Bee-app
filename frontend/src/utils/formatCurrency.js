export function formatCurrency(value, options = {}) {
  const amount = Number(value) || 0
  const { maximumFractionDigits = 2, minimumFractionDigits } = options
  const digits =
    minimumFractionDigits != null
      ? minimumFractionDigits
      : Number.isInteger(amount)
        ? 0
        : Math.min(2, maximumFractionDigits)

  return `₪${amount.toLocaleString('en-IL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, maximumFractionDigits),
  })}`
}
