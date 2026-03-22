const mongoose = require('mongoose')
const Expense = require('../models/Expense')
const Budget = require('../models/Budget')
const Hive = require('../models/Hive')

function utcMonthRange(referenceDate = new Date()) {
  const y = referenceDate.getUTCFullYear()
  const m = referenceDate.getUTCMonth()
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999))
  return { start, end }
}

async function sumPersonalCategorySpend(userId, category, start, end) {
  const filter = {
    userId,
    type: 'personal',
    category,
    isDeleted: false,
    date: { $gte: start, $lte: end },
  }
  const [row] = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total || 0
}

async function sumSharedCategorySpend(hiveId, category, start, end) {
  const filter = {
    hiveId: new mongoose.Types.ObjectId(hiveId),
    type: 'shared',
    category,
    isDeleted: false,
    date: { $gte: start, $lte: end },
  }
  const [row] = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total || 0
}

async function getBudgetStatusForBudget(budget, userId, hiveId, start, end) {
  let spent = 0
  if (budget.type === 'personal') {
    spent = await sumPersonalCategorySpend(userId, budget.category, start, end)
  } else if (budget.type === 'shared' && hiveId) {
    spent = await sumSharedCategorySpend(hiveId, budget.category, start, end)
  }
  const limit = budget.limitAmount
  const percentUsed = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
  return {
    id: budget._id.toString(),
    category: budget.category,
    period: budget.period,
    type: budget.type,
    limit,
    spent,
    percentUsed,
  }
}

async function getPersonalDashboard(userId, hiveId) {
  const { start, end } = utcMonthRange()

  const personalMatch = {
    userId,
    type: 'personal',
    isDeleted: false,
    date: { $gte: start, $lte: end },
  }

  const byCategory = await Expense.aggregate([
    { $match: personalMatch },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ])

  const totalSpendThisMonth = byCategory.reduce((sum, row) => sum + row.total, 0)
  const topCategory =
    byCategory.length > 0
      ? { category: byCategory[0]._id, amount: byCategory[0].total }
      : null

  const budgetQuery = { userId, type: 'personal' }
  const budgets = await Budget.find(budgetQuery).lean()
  const budgetStatus = await Promise.all(
    budgets.map((b) => getBudgetStatusForBudget(b, userId, hiveId, start, end)),
  )

  return {
    period: { from: start.toISOString(), to: end.toISOString() },
    hiveId: hiveId || null,
    totalSpendThisMonth,
    topCategory,
    budgetStatus,
    insightPlaceholder: null,
  }
}

async function getSharedDashboard(userId, hiveId) {
  if (!hiveId) {
    return {
      paired: false,
      period: null,
      hiveId: null,
      totalJointSpendThisMonth: 0,
      topSharedCategory: null,
      contributions: [],
      sharedBudgetStatus: [],
      message: 'No hive — pair with a partner to see shared finances.',
    }
  }

  const hive = await Hive.findById(hiveId)
  if (!hive || !hive.userIds.includes(userId)) {
    return null
  }

  const { start, end } = utcMonthRange()
  const hiveObjectId = new mongoose.Types.ObjectId(hiveId)

  const sharedMatch = {
    hiveId: hiveObjectId,
    type: 'shared',
    isDeleted: false,
    date: { $gte: start, $lte: end },
  }

  const byCategory = await Expense.aggregate([
    { $match: sharedMatch },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ])

  const totalJointSpendThisMonth = byCategory.reduce((sum, row) => sum + row.total, 0)
  const topSharedCategory =
    byCategory.length > 0
      ? { category: byCategory[0]._id, amount: byCategory[0].total }
      : null

  const byUser = await Expense.aggregate([
    { $match: sharedMatch },
    { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  ])

  const contributions = byUser.map((row) => ({
    userId: row._id,
    total: row.total,
  }))

  const sharedBudgets = await Budget.find({ hiveId, type: 'shared' }).lean()
  const sharedBudgetStatus = await Promise.all(
    sharedBudgets.map((b) => getBudgetStatusForBudget(b, userId, hiveId, start, end)),
  )

  return {
    paired: true,
    period: { from: start.toISOString(), to: end.toISOString() },
    hiveId,
    totalJointSpendThisMonth,
    topSharedCategory,
    contributions,
    sharedBudgetStatus,
  }
}

module.exports = {
  utcMonthRange,
  getPersonalDashboard,
  getSharedDashboard,
}
