/**
 * Build a query string from extracted receipt fields for embedding retrieval.
 * @param {import('../../receipts/contracts').ExtractedReceipt} extracted
 * @returns {string}
 */
function buildQueryText(extracted) {
  const parts = [
    extracted.vendor,
    extracted.category,
    extracted.amount != null ? `amount ${extracted.amount}` : null,
    extracted.currency,
    ...(extracted.lineItems || []).map((item) => `${item.description} ${item.amount}`),
    extracted.rawText?.slice(0, 300),
  ]
  return parts.filter(Boolean).join(' ').trim()
}

/**
 * Build a few-shot classification prompt with retrieved examples.
 * @param {import('../../receipts/contracts').ExtractedReceipt} extracted
 * @param {Array<{ text: string, type: string, score: number }>} retrieved
 * @returns {string}
 */
function buildFewShotPrompt(extracted, retrieved) {
  const exampleLines = retrieved
    .map((ex, i) => `${i + 1}. "${ex.text}" → ${ex.type}`)
    .join('\n')

  const lineItems = (extracted.lineItems || [])
    .map((item) => `- ${item.description}: ${item.amount}`)
    .join('\n')

  return `You classify expenses as "personal" or "shared" for a couples finance app.
Shared expenses are household bills, groceries for home, rent, utilities, joint subscriptions, and family purchases.
Personal expenses are individual treats, work lunches, solo hobbies, personal care, and gifts for friends.

Examples from similar past expenses:
${exampleLines || '(none)'}

Now classify this receipt:
Vendor: ${extracted.vendor || 'unknown'}
Amount: ${extracted.amount ?? 'unknown'} ${extracted.currency || ''}
Category: ${extracted.category || 'unknown'}
Date: ${extracted.date || 'unknown'}
Line items:
${lineItems || '(none)'}

Respond with JSON only: {"type":"personal"|"shared","confidence":0.0-1.0,"reasoning":"brief explanation"}`
}

module.exports = { buildQueryText, buildFewShotPrompt }
