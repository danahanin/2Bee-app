const mongoose = require('mongoose')
const Goal = require('../models/Goal')
const Hive = require('../models/Hive')
const User = require('../models/User')
const { CATEGORIES } = require('../models/Expense')
const { AppError } = require('../utils/appError')
const { calculateGoalMetrics } = require('../src/ai/goalGuidanceCalculator')
const { generateGoalGuidance } = require('../src/ai/goalGuidancePrompt')
const { getGoalSpendingContext } = require('../src/ai/goalGuidanceSpending')
const fxService = require('./fxService')

async function assertHiveMember(hiveId, userId) {
  if (!hiveId) {
    throw new AppError(400, 'NO_HIVE', 'hiveId is required for shared goals')
  }
  const hive = await Hive.findById(hiveId)
  if (!hive || !hive.userIds.includes(userId)) {
    throw new AppError(403, 'FORBIDDEN', 'Hive not found or access denied')
  }
  return hive
}

function serializeGoal(doc) {
  const progress =
    doc.targetAmount > 0
      ? Math.min(100, Math.round((doc.currentAmount / doc.targetAmount) * 100))
      : 0

  return {
    id: doc._id.toString(),
    userId: doc.userId,
    hiveId: doc.hiveId ? doc.hiveId.toString() : null,
    title: doc.title,
    targetAmount: doc.targetAmount,
    currentAmount: doc.currentAmount,
    deadline: doc.deadline,
    category: doc.category || null,
    progressPercent: progress,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

async function listGoals(userId, hiveId, scope = 'all') {
  if (scope === 'personal') {
    const goals = await Goal.find({ userId, hiveId: null }).sort({ deadline: 1 }).lean()
    return goals.map(serializeGoal)
  }

  if (scope === 'shared') {
    if (!hiveId) {
      return []
    }
    await assertHiveMember(hiveId, userId)
    const goals = await Goal.find({ hiveId }).sort({ deadline: 1 }).lean()
    return goals.map(serializeGoal)
  }

  const personalGoals = await Goal.find({ userId, hiveId: null }).lean()
  let sharedGoals = []
  if (hiveId) {
    const hive = await Hive.findById(hiveId)
    if (hive?.userIds.includes(userId)) {
      sharedGoals = await Goal.find({ hiveId }).lean()
    }
  }

  const merged = [...personalGoals, ...sharedGoals].sort(
    (a, b) => new Date(a.deadline) - new Date(b.deadline),
  )
  return merged.map(serializeGoal)
}

async function createGoal(userId, hiveId, payload) {
  const { title, targetAmount, currentAmount = 0, deadline, category, hiveId: bodyHiveId } = payload

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'title is required')
  }
  if (title.trim().length > 120) {
    throw new AppError(400, 'VALIDATION_ERROR', 'title must be 120 characters or less')
  }
  if (typeof targetAmount !== 'number' || targetAmount < 0.01) {
    throw new AppError(400, 'VALIDATION_ERROR', 'targetAmount must be a number greater than 0')
  }
  if (typeof currentAmount !== 'number' || currentAmount < 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'currentAmount must be a number greater than or equal to 0')
  }
  if (!deadline || Number.isNaN(Date.parse(deadline))) {
    throw new AppError(400, 'VALIDATION_ERROR', 'deadline must be a valid date')
  }
  if (category != null && category !== '' && !CATEGORIES.includes(category)) {
    throw new AppError(400, 'VALIDATION_ERROR', `category must be one of: ${CATEGORIES.join(', ')}`)
  }

  let goalHiveId = null
  if (bodyHiveId) {
    await assertHiveMember(bodyHiveId, userId)
    goalHiveId = new mongoose.Types.ObjectId(bodyHiveId)
  }

  const goal = await Goal.create({
    userId,
    hiveId: goalHiveId,
    title: title.trim(),
    targetAmount,
    currentAmount,
    deadline: new Date(deadline),
    category: category || undefined,
  })

  return serializeGoal(goal.toObject())
}

async function assertGoalAccess(goal, userId) {
  if (goal.hiveId) {
    await assertHiveMember(goal.hiveId.toString(), userId)
    return
  }
  if (goal.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this goal')
  }
}

function roundMoney(amount) {
  return Math.round(amount * 100) / 100
}

/**
 * Goal amounts are always stored in the base currency (ILS, same convention as
 * Expense/Budget). Convert the ones the AI guidance text will actually mention into
 * whatever currency the requesting user picked in Settings, so the LLM's response
 * matches what they see everywhere else in the app instead of defaulting to $.
 */
function buildDisplayAmounts(goal, metrics, rate) {
  const convert = (value) => (typeof value === 'number' ? roundMoney(value * rate) : value)

  return {
    targetAmount: convert(goal.targetAmount),
    currentAmount: convert(goal.currentAmount),
    remainingAmount: convert(metrics.remainingAmount),
    requiredMonthlyAmount: convert(metrics.requiredMonthlyAmount),
  }
}

function buildDisplaySpendingCategories(spendingContext, rate) {
  return spendingContext.map(({ category, avgMonthlyAmount }) => ({
    category,
    avgMonthlyAmount: roundMoney(avgMonthlyAmount * rate),
  }))
}

/**
 * Best-effort lookup of recent category spending to ground the AI's advice in the
 * user's real habits. This is a nice-to-have on top of the goal metrics — if the
 * aggregation query fails for any reason, guidance should still be generated using
 * the goal numbers alone rather than failing the whole request.
 */
async function safeGetSpendingContext(goal) {
  try {
    return await getGoalSpendingContext(goal)
  } catch (err) {
    console.warn('[getGoalGuidance] Could not load spending context:', err.message)
    return []
  }
}

/**
 * Loads a Goal, verifies the caller may view it (owner for a personal goal, any
 * Hive member for a shared one), computes deterministic progress metrics, and asks
 * the LLM to explain them in plain language. Nothing here is persisted — this is a
 * read-only, on-demand explanation of numbers the app already calculated.
 */
async function getGoalGuidance(userId, goalId) {
  if (!mongoose.Types.ObjectId.isValid(goalId)) {
    throw new AppError(404, 'NOT_FOUND', 'Goal not found')
  }

  const goal = await Goal.findById(goalId)
  if (!goal) {
    throw new AppError(404, 'NOT_FOUND', 'Goal not found')
  }

  await assertGoalAccess(goal, userId)

  const goalPlain = goal.toObject()
  const metrics = calculateGoalMetrics(goalPlain)
  if (!metrics.valid) {
    throw new AppError(400, 'VALIDATION_ERROR', `Goal data is incomplete or invalid: ${metrics.errors.join('; ')}`)
  }

  const requestingUser = await User.findById(userId).select('displayCurrency').lean()
  const displayCurrency = requestingUser?.displayCurrency || fxService.BASE_CURRENCY

  try {
    const rate = await fxService.getRate(fxService.BASE_CURRENCY, displayCurrency)
    const displayAmounts = buildDisplayAmounts(goalPlain, metrics, rate)
    const spendingContext = await safeGetSpendingContext(goalPlain)
    const topSpendingCategories = buildDisplaySpendingCategories(spendingContext, rate)

    const guidance = await generateGoalGuidance({
      goal: goalPlain,
      metrics,
      displayCurrency,
      displayAmounts,
      topSpendingCategories,
    })
    return { metrics, guidance }
  } catch (err) {
    console.warn('[getGoalGuidance] LLM guidance failed:', err.message)
    throw new AppError(503, 'AI_GUIDANCE_UNAVAILABLE', 'Could not generate AI guidance right now. Please try again.')
  }
}

module.exports = {
  listGoals,
  createGoal,
  getGoalGuidance,
}
