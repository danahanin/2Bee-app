const { makeClassification } = require('../../receipts/contracts')
const { classifyExpenseRuleBased } = require('../classifier')
const { retrieveSimilar, llmGenerate } = require('../rag')
const { buildQueryText, buildFewShotPrompt } = require('./buildPrompt')

/**
 * Parse LLM JSON response into a normalized Classification.
 * @param {string} raw
 * @param {Array<{ text: string, type: string, score: number }>} retrieved
 * @returns {import('../../receipts/contracts').Classification}
 */
function parseClassification(raw, retrieved) {
  let parsed
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
  } catch {
    throw new Error('Failed to parse LLM classification JSON')
  }

  const type = parsed.type === 'shared' ? 'shared' : 'personal'
  const confidence = typeof parsed.confidence === 'number'
    ? Math.min(1, Math.max(0, parsed.confidence))
    : 0.5
  const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : ''

  return makeClassification({
    type,
    confidence,
    reasoning,
    retrieved: retrieved.map(({ text, type: exType, score }) => ({ text, type: exType, score })),
  })
}

/**
 * Classify a receipt as personal or shared using RAG + LLM, with rule-based fallback.
 * @param {import('../../receipts/contracts').ExtractedReceipt} extractedReceipt
 * @param {{ k?: number }} [options]
 * @returns {Promise<import('../../receipts/contracts').Classification>}
 */
async function classifyPersonalShared(extractedReceipt, { k = 5 } = {}) {
  const queryText = buildQueryText(extractedReceipt)
  let retrieved = []

  try {
    retrieved = queryText ? await retrieveSimilar(queryText, { k }) : []
  } catch {
    retrieved = []
  }

  try {
    const prompt = buildFewShotPrompt(extractedReceipt, retrieved)
    const raw = await llmGenerate(prompt, { format: 'json', temperature: 0.2 })
    return parseClassification(raw, retrieved)
  } catch {
    const fallback = classifyExpenseRuleBased({
      description: extractedReceipt.vendor || extractedReceipt.rawText.slice(0, 200),
      amount: extractedReceipt.amount ?? 0,
      category: extractedReceipt.category ?? '',
    })

    return makeClassification({
      type: fallback.label,
      confidence: fallback.confidence,
      reasoning: `[fallback] ${fallback.reasoning}`,
      retrieved,
    })
  }
}

module.exports = { classifyPersonalShared, parseClassification, buildQueryText }
