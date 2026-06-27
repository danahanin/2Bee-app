export function formatCurrency(value, options = {}) {
  const amount = Number(value) || 0
  const { maximumFractionDigits = 2 } = options
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits,
  }).format(amount)
}
