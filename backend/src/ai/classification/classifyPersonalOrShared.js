const { classifyExpenseRuleBased } = require('../classifier')
const { retrieveSimilar } = require('../rag')
const { generateJSON, TASK_MODELS } = require('../llm')
const { buildSignalQueryText, buildLineItemsText } = require('./signalText')
const { parsePersonalOrSharedSuggestion } = require('./schemas')

// A retrieved example this similar is treated as a near-duplicate of a past expense —
// e.g. a haircut matching a previous haircut — and should dominate the decision.
const STRONG_MATCH_THRESHOLD = 0.75

/**
 * @param {import('./expenseSignal').ExpenseSignal} signal
 * @param {Array<{ text: string, type: string, score: number }>} examples
 * @returns {string}
 */
function buildPersonalOrSharedPrompt(signal, examples) {
  const exampleLines = examples
    .map((example, index) => `${index + 1}. "${example.text}" -> ${example.type} (similarity ${example.score.toFixed(2)})`)
    .join('\n')

  return `You classify expenses as "personal" or "shared" for a couple's shared-finance app.
Shared expenses are household bills, groceries for the home, rent, utilities, joint subscriptions, and family purchases.
Personal expenses are individual treats, work lunches, solo hobbies, personal care (e.g. a haircut), and gifts for friends.
A closely matching past example (similarity above ${STRONG_MATCH_THRESHOLD}) is a strong signal — trust it unless the current expense clearly differs.

Examples from this couple's shared history and curated examples:
${exampleLines || '(none)'}

Now classify this expense:
Description: ${signal.description || 'unknown'}
Vendor: ${signal.vendor || 'unknown'}
Amount: ${signal.amount ?? 'unknown'} ${signal.currency || ''}
Category hint: ${signal.category || 'unknown'}
Line items:
${buildLineItemsText(signal) || '(none)'}

Respond with JSON only: {"type":"personal"|"shared","confidence":0.0-1.0,"reasoning":"brief explanation"}`
}

/**
 * Retrieve few-shot examples combining curated seed examples with this hive's own
 * confirmed/corrected expense history, deduplicated and re-ranked by similarity.
 * @param {import('./expenseSignal').ExpenseSignal} signal
 * @param {{ hiveId?: string, k?: number }} [options]
 * @returns {Promise<Array<{ text: string, type: string, score: number, metadata?: object }>>}
 */
async function retrieveFewShotExamples(signal, { hiveId, k = 5 } = {}) {
  const queryText = buildSignalQueryText(signal)
  if (!queryText) return []

  const [curated, hiveSpecific] = await Promise.all([
    retrieveSimilar(queryText, { k, filter: { source: 'const' } }).catch(() => []),
    hiveId
      ? retrieveSimilar(queryText, { k, filter: { source: 'dynamic', hiveId: String(hiveId) } }).catch(() => [])
      : Promise.resolve([]),
  ])

  const seen = new Set()
  const merged = []
  for (const example of [...hiveSpecific, ...curated]) {
    const key = `${example.text}::${example.type}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(example)
  }

  return merged.sort((a, b) => b.score - a.score).slice(0, k)
}

/**
 * Rule-based fallback: trust a very close retrieved match first (the "haircut" case),
 * otherwise fall back to the generic keyword/category rule classifier.
 * @param {import('./expenseSignal').ExpenseSignal} signal
 * @param {Array<{ text: string, type: string, score: number }>} examples
 */
function fallbackFromRetrieval(signal, examples) {
  const topMatch = examples[0]
  if (topMatch && topMatch.score >= STRONG_MATCH_THRESHOLD) {
    return {
      value: topMatch.type,
      confidence: Math.min(0.95, 0.6 + topMatch.score * 0.4),
      reasoning: `[fallback] Closely matches a past "${topMatch.type}" expense: "${topMatch.text}" (similarity ${topMatch.score.toFixed(2)}).`,
    }
  }

  const ruleResult = classifyExpenseRuleBased({
    description: signal.description || signal.vendor || '',
    amount: signal.amount ?? 0,
    category: signal.category || '',
  })

  return {
    value: ruleResult.label,
    confidence: ruleResult.confidence,
    reasoning: `[fallback] ${ruleResult.reasoning}`,
  }
}

/**
 * Classify an expense as personal or shared using RAG few-shot + LLM, with a
 * retrieval-aware rule-based fallback. Never throws.
 * @param {import('./expenseSignal').ExpenseSignal} signal
 * @param {{ hiveId?: string, k?: number, model?: string }} [options] `model` overrides the configured classify model — used by the eval harness to compare candidates.
 * @returns {Promise<{ value: 'personal'|'shared', confidence: number, reasoning: string, retrieved: Array<object>, source: 'ai'|'fallback' }>}
 */
async function classifyPersonalOrShared(signal, { hiveId, k = 5, model } = {}) {
  let examples = []
  try {
    examples = await retrieveFewShotExamples(signal, { hiveId, k })
  } catch {
    /* keep examples as [] */
  }

  try {
    const raw = await generateJSON(buildPersonalOrSharedPrompt(signal, examples), {
      model: model || TASK_MODELS.classify,
      temperature: 0.2,
    })
    const suggestion = parsePersonalOrSharedSuggestion(raw)
    return { ...suggestion, retrieved: examples, source: 'ai' }
  } catch (err) {
    console.warn('[classifyPersonalOrShared] falling back to rule-based classifier:', err.message)
    const fallback = fallbackFromRetrieval(signal, examples)
    return { ...fallback, retrieved: examples, source: 'fallback' }
  }
}

module.exports = {
  classifyPersonalOrShared,
  buildPersonalOrSharedPrompt,
  retrieveFewShotExamples,
  STRONG_MATCH_THRESHOLD,
}
