/**
 * Feedback loop — turns a user-confirmed expense (from any creation path: manual,
 * receipt, or a reviewed bank-sync suggestion) into a labelled example for the
 * vector store, so future few-shot classification improves over time. Writing an
 * example must never fail the confirmation flow it's attached to, so every function
 * here swallows its own errors and resolves to a boolean instead of throwing.
 */
const { upsertExample } = require('../rag')

/**
 * @param {{ description?: string, category?: string, amount?: number, date?: string|Date, vendor?: string|null, rawText?: string|null, lineItems?: Array<{ description?: string, name?: string, amount?: number, price?: number }> }} input
 * @returns {string}
 */
function buildFeedbackText({ description, category, amount, date, vendor, rawText, lineItems = [] }) {
  const lineItemsText = (lineItems || [])
    .map((item) => `${item.description || item.name || ''} ${item.amount || item.price || ''}`.trim())
    .filter(Boolean)
    .join(', ')

  return [vendor || description, category, amount != null ? `amount ${amount}` : null, date, lineItemsText, rawText?.slice(0, 300)]
    .filter(Boolean)
    .join(' ')
    .trim()
}

/**
 * Record a confirmed personal-vs-shared decision as a few-shot example. Runs for
 * both labels — strong personal examples (haircuts, solo coffee) are just as
 * valuable as shared ones for future retrieval.
 * @param {{ _id: unknown, type: 'personal'|'shared', description: string, category: string, amount: number, date: Date, hiveId?: unknown }} expense
 * @param {{ vendor?: string|null, rawText?: string|null, lineItems?: Array<object> }} [sourceDetails]
 * @returns {Promise<boolean>}
 */
async function recordPersonalOrSharedFeedback(expense, sourceDetails = {}) {
  const text = buildFeedbackText({
    description: expense.description,
    category: expense.category,
    amount: expense.amount,
    date: expense.date,
    vendor: sourceDetails.vendor,
    rawText: sourceDetails.rawText,
    lineItems: sourceDetails.lineItems,
  })
  if (!text) return false

  try {
    await upsertExample({
      text,
      metadata: {
        type: expense.type,
        source: 'dynamic',
        expenseId: String(expense._id),
        ...(expense.hiveId ? { hiveId: String(expense.hiveId) } : {}),
      },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Record which hive group a shared expense belongs to, so `suggestHive` can retrieve
 * it as a precedent for this hive next time. No-op for personal expenses or when no
 * group was chosen.
 * @param {{ _id: unknown, type: 'personal'|'shared', description: string, category: string, amount: number, date: Date, hiveId?: unknown }} expense
 * @param {{ _id: unknown, name: string }|null} expenseGroup
 * @param {{ vendor?: string|null, rawText?: string|null, lineItems?: Array<object> }} [sourceDetails]
 * @returns {Promise<boolean>}
 */
async function recordHiveFeedback(expense, expenseGroup, sourceDetails = {}) {
  if (expense.type !== 'shared' || !expenseGroup || !expense.hiveId) return false

  const text = buildFeedbackText({
    description: expense.description,
    category: expense.category,
    amount: expense.amount,
    date: expense.date,
    vendor: sourceDetails.vendor,
    rawText: sourceDetails.rawText,
    lineItems: sourceDetails.lineItems,
  })
  if (!text) return false

  try {
    await upsertExample({
      text,
      metadata: {
        type: 'shared',
        source: 'dynamic',
        hiveId: String(expense.hiveId),
        expenseGroupId: String(expenseGroup._id),
        groupName: expenseGroup.name,
        expenseId: String(expense._id),
      },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Convenience wrapper that records both feedback signals for a just-confirmed expense.
 * @param {object} expense
 * @param {{ expenseGroup?: {_id: unknown, name: string}|null, vendor?: string|null, rawText?: string|null, lineItems?: Array<object> }} [options]
 */
async function recordExpenseConfirmationFeedback(expense, { expenseGroup = null, ...sourceDetails } = {}) {
  const [personalOrShared, hive] = await Promise.all([
    recordPersonalOrSharedFeedback(expense, sourceDetails),
    recordHiveFeedback(expense, expenseGroup, sourceDetails),
  ])
  return { personalOrShared, hive }
}

module.exports = {
  buildFeedbackText,
  recordPersonalOrSharedFeedback,
  recordHiveFeedback,
  recordExpenseConfirmationFeedback,
}
