const MS_PER_DAY = 86400000
const AVG_DAYS_PER_MONTH = 30.44
const MS_PER_MONTH = AVG_DAYS_PER_MONTH * MS_PER_DAY
// A goal due in 2 days shouldn't produce a division-by-near-zero monthly figure —
// clamp the divisor to "at least ~1 day" so requiredMonthlyAmount stays a large but
// finite, honest number instead of exploding toward Infinity.
const MIN_MONTHS_DIVISOR = 1 / AVG_DAYS_PER_MONTH
const DUE_SOON_DAYS_THRESHOLD = 14

function roundMoney(amount) {
  return Math.round(amount * 100) / 100
}

/**
 * @param {{ targetAmount?: unknown, currentAmount?: unknown, deadline?: unknown }} goal
 * @returns {string[]} Empty when the goal has everything needed for the math below.
 */
function validateGoalInputs(goal = {}) {
  const errors = []
  const targetAmount = Number(goal.targetAmount)
  const currentAmount = Number(goal.currentAmount)
  const deadline = goal.deadline ? new Date(goal.deadline) : null

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    errors.push('targetAmount must be a positive number')
  }
  if (!Number.isFinite(currentAmount) || currentAmount < 0) {
    errors.push('currentAmount must be zero or a positive number')
  }
  if (!deadline || Number.isNaN(deadline.getTime())) {
    errors.push('deadline must be a valid date')
  }

  return errors
}

/**
 * Deterministic Goal-progress math (remaining amount, remaining time, required
 * monthly amount, progress percent, and a status label). The LLM never computes or
 * invents any of these numbers — it only receives them and explains them.
 *
 * @param {{ targetAmount: number, currentAmount: number, deadline: string|Date }} goal
 * @param {Date} [now]
 * @returns {{ valid: false, errors: string[] } | {
 *   valid: true,
 *   status: 'completed'|'expired'|'due_soon'|'on_track',
 *   overfunded: boolean,
 *   remainingAmount: number,
 *   progressPercent: number,
 *   daysRemaining: number,
 *   monthsRemaining: number,
 *   requiredMonthlyAmount: number|null,
 * }}
 */
function calculateGoalMetrics(goal = {}, now = new Date()) {
  const errors = validateGoalInputs(goal)
  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const targetAmount = Number(goal.targetAmount)
  const currentAmount = Number(goal.currentAmount)
  const deadline = new Date(goal.deadline)

  const isCompleted = currentAmount >= targetAmount
  const overfunded = currentAmount > targetAmount

  const remainingAmount = roundMoney(Math.max(0, targetAmount - currentAmount))
  const progressPercent = Math.min(100, Math.round((currentAmount / targetAmount) * 100))

  const msRemaining = deadline.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / MS_PER_DAY)
  const monthsRemaining = msRemaining > 0 ? msRemaining / MS_PER_MONTH : 0

  const isExpired = !isCompleted && msRemaining <= 0
  const isDueSoon = !isCompleted && !isExpired && daysRemaining <= DUE_SOON_DAYS_THRESHOLD

  let status = 'on_track'
  if (isCompleted) status = 'completed'
  else if (isExpired) status = 'expired'
  else if (isDueSoon) status = 'due_soon'

  const requiredMonthlyAmount =
    status === 'on_track' || status === 'due_soon'
      ? roundMoney(remainingAmount / Math.max(monthsRemaining, MIN_MONTHS_DIVISOR))
      : null

  return {
    valid: true,
    status,
    overfunded,
    remainingAmount,
    progressPercent,
    daysRemaining,
    monthsRemaining: Math.round(monthsRemaining * 100) / 100,
    requiredMonthlyAmount,
  }
}

module.exports = {
  calculateGoalMetrics,
  validateGoalInputs,
  DUE_SOON_DAYS_THRESHOLD,
}
