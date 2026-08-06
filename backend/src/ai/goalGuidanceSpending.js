/**
 * Deterministic "what have you actually been spending on" context for AI Goal
 * Guidance. This intentionally reuses the same category aggregation already
 * trusted for AI forecasting (backend/src/ai/expenseTotals.js) instead of doing
 * anything RAG/embedding-based:
 *   - It's a numeric aggregate (category -> average monthly total), not raw
 *     transaction text, so nothing sensitive (merchant names, descriptions,
 *     dates) ever reaches the LLM.
 *   - It's scoped by the exact same personal-vs-shared rules used everywhere
 *     else (personal goal -> the owner's own personal expenses only; shared
 *     goal -> the Hive's shared expenses only, never a partner's private
 *     spending), so there's no new privacy surface to reason about.
 *   - It's explainable and testable like the rest of this feature's
 *     calculations — a real semantic-search/RAG pipeline would add a lot of
 *     complexity and a second point of failure for a "did they spend a lot on
 *     dining lately" question that a plain aggregate already answers well.
 */

const { getPersonalCategoryMonthTotals, getSharedCategoryMonthTotals } = require('./expenseTotals')

const MONTHS_TO_CONSIDER = 3
const MAX_CATEGORIES = 3
// Ignore rounding dust / near-zero categories so the LLM doesn't get handed a
// "you spend ₪0.40 on X" line.
const MIN_AVG_MONTHLY_AMOUNT = 1

/**
 * @param {{ userId: string, hiveId?: string|import('mongoose').Types.ObjectId|null }} goal
 * @param {{ referenceDate?: Date }} [options]
 * @returns {Promise<Array<{ category: string, avgMonthlyAmount: number }>>}
 *   Top categories by average monthly spend over the last few months, in the
 *   app's base currency (ILS), sorted highest-spend first. Empty when there
 *   isn't enough spending history to say anything meaningful.
 */
async function getGoalSpendingContext(goal, options = {}) {
  const monthTotals = goal.hiveId
    ? await getSharedCategoryMonthTotals(goal.hiveId, {
        monthCount: MONTHS_TO_CONSIDER,
        referenceDate: options.referenceDate,
      })
    : await getPersonalCategoryMonthTotals(goal.userId, {
        monthCount: MONTHS_TO_CONSIDER,
        referenceDate: options.referenceDate,
      })

  return Object.entries(monthTotals)
    .map(([category, monthlyBuckets]) => {
      // Average only over months that actually had spend in this category, so
      // a category the user stopped using a while ago doesn't get diluted to
      // near-zero by empty months.
      const monthsWithSpend = monthlyBuckets.filter((amount) => amount > 0)
      const avgMonthlyAmount = monthsWithSpend.length
        ? monthsWithSpend.reduce((sum, amount) => sum + amount, 0) / monthsWithSpend.length
        : 0
      return { category, avgMonthlyAmount }
    })
    .filter((entry) => entry.avgMonthlyAmount >= MIN_AVG_MONTHLY_AMOUNT)
    .sort((a, b) => b.avgMonthlyAmount - a.avgMonthlyAmount)
    .slice(0, MAX_CATEGORIES)
}

module.exports = {
  getGoalSpendingContext,
  MONTHS_TO_CONSIDER,
  MAX_CATEGORIES,
}
