const { classifyCategory } = require('./classifyCategory')
const { classifyPersonalOrShared } = require('./classifyPersonalOrShared')
const { suggestHive } = require('../phase2/suggestHive')

function hiveSuggestionSource(hiveSuggestion) {
  if (!hiveSuggestion) return null
  const isFallback = /\[fallback\]|No active hive|No expense groups/.test(hiveSuggestion.reasoning || '')
  return isFallback ? 'fallback' : 'ai'
}

/**
 * Run every classification task for a single expense and return a suggestion bundle.
 * Pure — no side effects, no persistence. Callers decide what to do with the
 * suggestions (the app never auto-applies an AI decision).
 * @param {import('./expenseSignal').ExpenseSignal} signal
 * @param {{ userId?: string, hiveId?: string, k?: number }} [options]
 * @returns {Promise<{
 *   category: { value: string, confidence: number, source: 'ai'|'fallback' },
 *   personalOrShared: { value: 'personal'|'shared', confidence: number, reasoning: string, retrieved: Array<object>, source: 'ai'|'fallback' },
 *   hive: { expenseGroupId: string|null, groupName: string|null, confidence: number, reasoning: string, alternatives: Array<object>, source: 'ai'|'fallback' } | null,
 * }>}
 */
async function classifyExpense(signal, { userId, hiveId, k = 5 } = {}) {
  const [category, personalOrShared] = await Promise.all([
    classifyCategory(signal),
    classifyPersonalOrShared(signal, { hiveId, k }),
  ])

  let hive = null
  if (personalOrShared.value === 'shared') {
    const hiveSuggestion = await suggestHive(signal, { hiveId, userId, k })
    hive = { ...hiveSuggestion, source: hiveSuggestionSource(hiveSuggestion) }
  }

  return { category, personalOrShared, hive }
}

module.exports = { classifyExpense }
