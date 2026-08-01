const { CATEGORIES } = require('../../../models/Expense')
const { generateJSON, TASK_MODELS } = require('../llm')
const { buildSignalQueryText, buildLineItemsText } = require('./signalText')
const { classifyCategoryRuleBased } = require('./categoryRules')
const { parseCategorySuggestion } = require('./schemas')

// Short definitions for categories an LLM tends to confuse (e.g. filing a haircut
// under "health" instead of "shopping"). Only the ambiguous ones need a hint.
const CATEGORY_HINTS = {
  health: 'medical only — doctor, dentist, pharmacy, hospital, therapy',
  shopping: 'clothing, electronics, personal care and grooming (haircuts, cosmetics), general retail',
  entertainment: 'movies, concerts, games, hobbies, gym/fitness memberships',
  subscriptions: 'recurring digital services — streaming, software, memberships billed periodically',
  other: 'only when nothing else reasonably fits',
}

function formatCategoryList() {
  return CATEGORIES.map((cat) => (CATEGORY_HINTS[cat] ? `${cat} (${CATEGORY_HINTS[cat]})` : cat)).join(', ')
}

/**
 * @param {import('./expenseSignal').ExpenseSignal} signal
 * @returns {string}
 */
function buildCategoryPrompt(signal) {
  return `Classify this expense into exactly one category.
Allowed categories: ${formatCategoryList()}.

Expense:
Description: ${signal.description || 'unknown'}
Vendor: ${signal.vendor || 'unknown'}
Amount: ${signal.amount ?? 'unknown'} ${signal.currency || ''}
Category hint from source (may be unreliable): ${signal.category || 'unknown'}
Line items:
${buildLineItemsText(signal) || '(none)'}

Respond with JSON only: {"category":"one of the allowed categories","confidence":0.0-1.0}`
}

/**
 * Suggest an expense category for the Expense CATEGORIES enum. Never throws — falls
 * back to keyword matching when the LLM is unavailable or returns invalid JSON.
 * @param {import('./expenseSignal').ExpenseSignal} signal
 * @param {{ model?: string }} [options] Overrides the configured category model — used by the eval harness to compare candidates.
 * @returns {Promise<{ value: string, confidence: number, source: 'ai'|'fallback' }>}
 */
async function classifyCategory(signal, { model } = {}) {
  try {
    const raw = await generateJSON(buildCategoryPrompt(signal), {
      model: model || TASK_MODELS.category,
      temperature: 0.1,
    })
    const suggestion = parseCategorySuggestion(raw)
    return { ...suggestion, source: 'ai' }
  } catch (err) {
    console.warn('[classifyCategory] falling back to rule-based classifier:', err.message)
    const fallback = classifyCategoryRuleBased(buildSignalQueryText(signal))
    return { value: fallback.value, confidence: fallback.confidence, source: 'fallback' }
  }
}

module.exports = { classifyCategory, buildCategoryPrompt }
