/**
 * ExpenseSignal — the normalized shape every classification task consumes, regardless of
 * where the expense came from (manual entry, bank sync, receipt scan). Adapters below
 * translate each source's native shape into this one so `classifyExpense` never has to
 * know about receipts, bank transactions, or form payloads.
 *
 * @typedef {Object} ExpenseSignal
 * @property {string} description Free-text description of the expense.
 * @property {string|null} vendor
 * @property {number|null} amount
 * @property {string|null} category A raw category hint from the source (not necessarily
 *   one of the Expense CATEGORIES enum) — the category task treats this as a hint, not a fact.
 * @property {string|null} currency
 * @property {string|null} date ISO 8601 date string, or null.
 * @property {Array<{ description: string, amount: number }>} lineItems
 * @property {string|null} rawText Raw OCR/source text, if any.
 */

/**
 * @param {Partial<ExpenseSignal>} [input]
 * @returns {ExpenseSignal}
 */
function makeExpenseSignal({
  description = '',
  vendor = null,
  amount = null,
  category = null,
  currency = null,
  date = null,
  lineItems = [],
  rawText = null,
} = {}) {
  return { description, vendor, amount, category, currency, date, lineItems, rawText }
}

/**
 * @param {import('../../receipts/contracts').ExtractedReceipt} extracted
 * @returns {ExpenseSignal}
 */
function fromExtractedReceipt(extracted) {
  return makeExpenseSignal({
    description: extracted.vendor || (extracted.rawText || '').slice(0, 200),
    vendor: extracted.vendor,
    amount: extracted.amount,
    category: extracted.category,
    currency: extracted.currency,
    date: extracted.date,
    lineItems: extracted.lineItems || [],
    rawText: extracted.rawText || null,
  })
}

/**
 * @param {{ description: string, amount: number, category?: string, currency?: string, date?: string, vendor?: string, lineItems?: Array<{ description: string, amount: number }> }} input
 * @returns {ExpenseSignal}
 */
function fromManualExpense({
  description,
  amount,
  category = null,
  currency = null,
  date = null,
  vendor = null,
  lineItems = [],
}) {
  return makeExpenseSignal({ description, amount, category, currency, date, vendor, lineItems })
}

/**
 * @param {{ description?: string, remittanceInformation?: string, amount: number, currency?: string, bookingDate?: string, valueDate?: string }} transaction
 * @param {{ category?: string }} [options] Category already mapped from the raw bank category, if known.
 * @returns {ExpenseSignal}
 */
function fromBankTransaction(transaction, { category = null } = {}) {
  return makeExpenseSignal({
    description: transaction.description || transaction.remittanceInformation || 'Bank transaction',
    amount: Math.abs(transaction.amount || 0),
    category,
    currency: transaction.currency || null,
    date: transaction.bookingDate || transaction.valueDate || null,
  })
}

module.exports = { makeExpenseSignal, fromExtractedReceipt, fromManualExpense, fromBankTransaction }
