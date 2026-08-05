/**
 * Builds the prompt for "AI Guidance" on an existing Goal, and validates the LLM's
 * response against a strict schema before it can reach a controller. The LLM is only
 * ever given numbers this app already computed (see goalGuidanceCalculator.js) — it
 * explains them, it never calculates or invents them.
 */

const { z } = require('zod')
const { generateJSON } = require('./llm')
const { DUE_SOON_DAYS_THRESHOLD } = require('./goalGuidanceCalculator')

const MAX_STEPS = 3
const MIN_STEPS = 2

const guidanceResponseSchema = z.object({
  summary: z.string().trim().min(1).max(400),
  monthlyTargetExplanation: z.string().trim().min(1).max(400),
  actionSteps: z.array(z.string().trim().min(1).max(200)).min(MIN_STEPS).max(MAX_STEPS),
  alternativeOption: z.string().trim().min(1).max(400),
})

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'unknown' : date.toISOString().split('T')[0]
}

/**
 * @param {{ goal: { title: string, category?: string|null, targetAmount: number, currentAmount: number, deadline: string|Date },
 *   metrics: import('./goalGuidanceCalculator').calculateGoalMetrics extends (...args: any) => infer R ? R : never }} input
 * @returns {string}
 */
function buildGoalGuidancePrompt({ goal, metrics }) {
  const facts = {
    title: goal.title,
    category: goal.category || 'uncategorized',
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    deadline: formatDate(goal.deadline),
    status: metrics.status,
    remainingAmount: metrics.remainingAmount,
    progressPercent: metrics.progressPercent,
    daysRemaining: metrics.daysRemaining,
    monthsRemaining: metrics.monthsRemaining,
    requiredMonthlyAmount: metrics.requiredMonthlyAmount,
  }

  return `You are a supportive financial-planning assistant inside a budgeting app. A user has an existing personal or shared savings/spending Goal. Every number below was already calculated by the application — treat them as fixed, correct facts. Never invent, recalculate, or contradict any number.

Goal facts (JSON):
${JSON.stringify(facts, null, 2)}

"status" meanings:
- "completed": currentAmount has reached or passed targetAmount.
- "expired": the deadline has already passed and the goal is not completed.
- "due_soon": the deadline is within ${DUE_SOON_DAYS_THRESHOLD} days and the goal is not completed.
- "on_track": there is still time left and the goal is not completed.

How to respond based on status:
- "completed": congratulate the user and suggest maintaining or reviewing the achievement. Do not propose a new savings plan.
- "expired": gently note the deadline has passed and suggest reviewing or updating the deadline or plan. Do not claim the old monthly amount is still achievable.
- "on_track" or "due_soon": explain the approximate monthly amount required using requiredMonthlyAmount, and give practical next steps.

Rules:
- Never state or imply the user is guaranteed to reach the goal.
- Never present this as professional or certified financial advice.
- Be supportive, clear, and non-judgmental. Keep every field short (one to a few sentences, or short list items).
- "alternativeOption" must always be filled in: for "on_track"/"due_soon" suggest one concrete, simple adjustment (e.g. extending the deadline, or lowering the target) that would ease the required monthly amount; for "completed" suggest something like setting a new goal or reviewing spending; for "expired" suggest picking a new deadline.
- "actionSteps" must contain exactly 2 or 3 short, practical, generic steps. Do not introduce numbers that were not given to you.

Respond with JSON only, matching exactly this shape:
{"summary":"...","monthlyTargetExplanation":"...","actionSteps":["...","..."],"alternativeOption":"..."}`
}

/**
 * @param {{ goal: object, metrics: object }} input
 * @returns {Promise<{ summary: string, monthlyTargetExplanation: string, actionSteps: string[], alternativeOption: string }>}
 */
async function generateGoalGuidance({ goal, metrics }) {
  const prompt = buildGoalGuidancePrompt({ goal, metrics })
  const raw = await generateJSON(prompt, { temperature: 0.4 })

  const parsed = guidanceResponseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`Invalid goal guidance response: ${parsed.error.issues[0]?.message || 'schema mismatch'}`)
  }
  return parsed.data
}

module.exports = {
  buildGoalGuidancePrompt,
  generateGoalGuidance,
  guidanceResponseSchema,
}
