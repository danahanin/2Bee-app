/**
 * Zod schemas that gate every raw LLM classification output before it reaches callers.
 * Values are first "repaired" (clamped confidence, defaulted type/category) the same way
 * the original phase1/phase2 parsers did, then validated — so malformed-but-recoverable
 * output still produces a usable suggestion instead of a hard failure.
 */

const { z } = require('zod')
const { CATEGORIES } = require('../../../models/Expense')

function clampConfidence(value, fallback = 0.5) {
  return typeof value === 'number' && !Number.isNaN(value) ? Math.min(1, Math.max(0, value)) : fallback
}

const categorySuggestionSchema = z.object({
  category: z.enum(CATEGORIES),
  confidence: z.number().min(0).max(1),
})

/**
 * @param {unknown} raw Parsed JSON from the LLM.
 * @returns {{ value: string, confidence: number }}
 */
function parseCategorySuggestion(raw) {
  const category = typeof raw?.category === 'string' ? raw.category.trim().toLowerCase() : ''
  const confidence = clampConfidence(raw?.confidence)

  const result = categorySuggestionSchema.safeParse({ category, confidence })
  if (!result.success) {
    throw new Error(`Invalid category suggestion: ${result.error.issues[0]?.message || 'schema mismatch'}`)
  }
  return { value: result.data.category, confidence: result.data.confidence }
}

const personalOrSharedSchema = z.object({
  type: z.enum(['personal', 'shared']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

/**
 * @param {unknown} raw Parsed JSON from the LLM.
 * @returns {{ value: 'personal'|'shared', confidence: number, reasoning: string }}
 */
function parsePersonalOrSharedSuggestion(raw) {
  const type = raw?.type === 'shared' ? 'shared' : 'personal'
  const confidence = clampConfidence(raw?.confidence)
  const reasoning = typeof raw?.reasoning === 'string' ? raw.reasoning : ''

  const result = personalOrSharedSchema.safeParse({ type, confidence, reasoning })
  if (!result.success) {
    throw new Error(`Invalid personal/shared suggestion: ${result.error.issues[0]?.message || 'schema mismatch'}`)
  }
  return { value: result.data.type, confidence: result.data.confidence, reasoning: result.data.reasoning }
}

module.exports = {
  categorySuggestionSchema,
  personalOrSharedSchema,
  parseCategorySuggestion,
  parsePersonalOrSharedSuggestion,
  clampConfidence,
}
