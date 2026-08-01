/**
 * Build a single query string from an ExpenseSignal, used both for RAG embedding
 * retrieval and as the human-readable expense summary inside LLM prompts.
 * @param {import('./expenseSignal').ExpenseSignal} signal
 * @returns {string}
 */
function buildSignalQueryText(signal) {
  const parts = [
    signal.vendor,
    signal.category,
    signal.amount != null ? `amount ${signal.amount}` : null,
    signal.currency,
    ...(signal.lineItems || []).map((item) => `${item.description} ${item.amount}`),
    signal.description,
    signal.rawText ? signal.rawText.slice(0, 300) : null,
  ]
  return parts.filter(Boolean).join(' ').trim()
}

/**
 * Render line items as a bullet list for prompt display.
 * @param {import('./expenseSignal').ExpenseSignal} signal
 * @returns {string}
 */
function buildLineItemsText(signal) {
  return (signal.lineItems || [])
    .map((item) => `- ${item.description}: ${item.amount}`)
    .join('\n')
}

module.exports = { buildSignalQueryText, buildLineItemsText }
