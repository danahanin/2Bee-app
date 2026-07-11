const mongoose = require('mongoose')
const Budget = require('../models/Budget')
const { PERIODS, BUDGET_TYPES } = require('../models/Budget')
const { CATEGORIES } = require('../models/Expense')
const Hive = require('../models/Hive')
const { AppError } = require('../utils/appError')
const { getBudgetStatusForBudget, utcMonthRange } = require('./dashboardService')

async function assertHiveMember(hiveId, userId) {
  if (!hiveId) {
    throw new AppError(400, 'NO_HIVE', 'Pair with a partner to manage shared budgets')
  }
  const hive = await Hive.findById(hiveId)
  if (!hive || !hive.userIds.includes(userId)) {
    throw new AppError(403, 'FORBIDDEN', 'Hive not found or access denied')
  }
  return hive
}

async function findDuplicateBudget({ type, userId, hiveId, category, excludeId = null }) {
  const query = { category, type }
  if (type === 'personal') {
    query.userId = userId
    query.hiveId = null
  } else {
    query.hiveId = new mongoose.Types.ObjectId(hiveId)
    query.type = 'shared'
  }
  if (excludeId) {
    query._id = { $ne: excludeId }
  }
  return Budget.findOne(query).lean()
}

function serializeBudget(doc, status) {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    hiveId: doc.hiveId ? doc.hiveId.toString() : null,
    category: doc.category,
    limit: doc.limitAmount,
    period: doc.period,
    type: doc.type,
    spent: status.spent,
    percentUsed: status.percentUsed,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

async function withBudgetStatus(budget, userId, hiveId) {
  const { start, end } = utcMonthRange()
  const status = await getBudgetStatusForBudget(budget, userId, hiveId, start, end)
  return serializeBudget(budget, status)
}

async function listBudgets(userId, hiveId, type) {
  let budgets
  if (type === 'personal') {
    budgets = await Budget.find({ userId, type: 'personal' }).sort({ category: 1 }).lean()
  } else if (type === 'shared') {
    await assertHiveMember(hiveId, userId)
    budgets = await Budget.find({ hiveId, type: 'shared' }).sort({ category: 1 }).lean()
  } else {
    const personal = await Budget.find({ userId, type: 'personal' }).lean()
    let shared = []
    if (hiveId) {
      const hive = await Hive.findById(hiveId)
      if (hive?.userIds.includes(userId)) {
        shared = await Budget.find({ hiveId, type: 'shared' }).lean()
      }
    }
    budgets = [...personal, ...shared]
  }

  return Promise.all(budgets.map((budget) => withBudgetStatus(budget, userId, hiveId)))
}

async function getBudgetById(budgetId, userId, hiveId) {
  const budget = await Budget.findById(budgetId)
  if (!budget) {
    throw new AppError(404, 'NOT_FOUND', 'Budget not found')
  }
  await assertBudgetAccess(budget, userId, hiveId)
  return withBudgetStatus(budget.toObject(), userId, hiveId)
}

async function assertBudgetAccess(budget, userId, hiveId) {
  if (budget.type === 'personal') {
    if (budget.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only access your own personal budgets')
    }
    return
  }

  const budgetHiveId = budget.hiveId?.toString()
  if (!budgetHiveId || budgetHiveId !== hiveId) {
    throw new AppError(403, 'FORBIDDEN', 'Shared budget is not in your hive')
  }
  await assertHiveMember(budgetHiveId, userId)
}

async function createBudget(userId, hiveId, payload) {
  const { category, limit, period, type } = payload

  if (!CATEGORIES.includes(category)) {
    throw new AppError(400, 'VALIDATION_ERROR', `category must be one of: ${CATEGORIES.join(', ')}`)
  }
  if (!BUDGET_TYPES.includes(type)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'type must be personal or shared')
  }
  if (!PERIODS.includes(period)) {
    throw new AppError(400, 'VALIDATION_ERROR', `period must be one of: ${PERIODS.join(', ')}`)
  }
  if (typeof limit !== 'number' || limit < 0.01) {
    throw new AppError(400, 'VALIDATION_ERROR', 'limit must be a number greater than 0')
  }

  let budgetHiveId = null
  if (type === 'shared') {
    await assertHiveMember(hiveId, userId)
    budgetHiveId = new mongoose.Types.ObjectId(hiveId)
  }

  const duplicate = await findDuplicateBudget({
    type,
    userId,
    hiveId,
    category,
  })
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_BUDGET', 'A budget already exists for this category and scope')
  }

  const budget = await Budget.create({
    userId,
    hiveId: budgetHiveId,
    category,
    limitAmount: limit,
    period,
    type,
  })

  return withBudgetStatus(budget.toObject(), userId, hiveId)
}

async function updateBudget(budgetId, userId, hiveId, payload) {
  const budget = await Budget.findById(budgetId)
  if (!budget) {
    throw new AppError(404, 'NOT_FOUND', 'Budget not found')
  }
  await assertBudgetAccess(budget, userId, hiveId)

  const nextCategory = payload.category ?? budget.category
  const nextPeriod = payload.period ?? budget.period
  const nextLimit = payload.limit ?? budget.limitAmount

  if (payload.category && !CATEGORIES.includes(payload.category)) {
    throw new AppError(400, 'VALIDATION_ERROR', `category must be one of: ${CATEGORIES.join(', ')}`)
  }
  if (payload.period && !PERIODS.includes(payload.period)) {
    throw new AppError(400, 'VALIDATION_ERROR', `period must be one of: ${PERIODS.join(', ')}`)
  }
  if (payload.limit != null && (typeof payload.limit !== 'number' || payload.limit < 0.01)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'limit must be a number greater than 0')
  }

  const duplicate = await findDuplicateBudget({
    type: budget.type,
    userId: budget.userId,
    hiveId: budget.hiveId?.toString() || hiveId,
    category: nextCategory,
    excludeId: budget._id,
  })
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_BUDGET', 'A budget already exists for this category and scope')
  }

  budget.category = nextCategory
  budget.period = nextPeriod
  budget.limitAmount = nextLimit
  await budget.save()

  return withBudgetStatus(budget.toObject(), userId, hiveId)
}

async function deleteBudget(budgetId, userId, hiveId) {
  const budget = await Budget.findById(budgetId)
  if (!budget) {
    throw new AppError(404, 'NOT_FOUND', 'Budget not found')
  }
  await assertBudgetAccess(budget, userId, hiveId)
  await budget.deleteOne()
  return { deleted: true, id: budgetId }
}

module.exports = {
  listBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
}
