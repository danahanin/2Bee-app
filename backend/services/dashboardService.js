const mongoose = require('mongoose')
const Expense = require('../models/Expense')
const Budget = require('../models/Budget')
const Hive = require('../models/Hive')
const User = require('../models/User')

const VALID_PERIOD_KEYS = ['month', '90d', 'all']

function utcMonthRange(referenceDate = new Date()) {
  const y = referenceDate.getUTCFullYear()
  const m = referenceDate.getUTCMonth()
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999))
  return { start, end }
}

function resolvePeriodRange(periodKey = 'month') {
  const key = VALID_PERIOD_KEYS.includes(periodKey) ? periodKey : 'month'
  const now = new Date()

  if (key === 'all') {
    return {
      key,
      label: 'All time',
      start: null,
      end: null,
    }
  }

  if (key === '90d') {
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - 89)
    start.setUTCHours(0, 0, 0, 0)
    return {
      key,
      label: 'Last 90 days',
      start,
      end,
    }
  }

  const { start, end } = utcMonthRange(now)
  const monthLabel = start.toLocaleDateString('en-IL', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return {
    key,
    label: monthLabel,
    start,
    end,
  }
}

function dateFilter(start, end) {
  if (!start && !end) return {}
  return { date: { $gte: start, $lte: end } }
}

function toHiveObjectId(hiveId) {
  if (!hiveId) return null
  return hiveId instanceof mongoose.Types.ObjectId ? hiveId : new mongoose.Types.ObjectId(hiveId)
}

async function sumPersonalCategorySpend(userId, category, start, end) {
  const filter = {
    userId,
    type: 'personal',
    category,
    isDeleted: false,
    ...dateFilter(start, end),
  }
  const [row] = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total || 0
}

async function sumSharedCategorySpend(hiveId, category, start, end) {
  const filter = {
    hiveId: toHiveObjectId(hiveId),
    type: 'shared',
    category,
    isDeleted: false,
    ...dateFilter(start, end),
  }
  const [row] = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total || 0
}

async function sumUserSharedCategorySpend(userId, hiveId, category, start, end) {
  const filter = {
    userId,
    hiveId: toHiveObjectId(hiveId),
    type: 'shared',
    category,
    isDeleted: false,
    ...dateFilter(start, end),
  }
  const [row] = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total || 0
}

async function sumPersonalSpend(userId, start, end) {
  const filter = {
    userId,
    type: 'personal',
    isDeleted: false,
    ...dateFilter(start, end),
  }
  const [row] = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total || 0
}

async function sumUserSharedSpend(userId, hiveId, start, end) {
  if (!hiveId) return 0
  const filter = {
    userId,
    hiveId: toHiveObjectId(hiveId),
    type: 'shared',
    isDeleted: false,
    ...dateFilter(start, end),
  }
  const [row] = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total || 0
}

async function sumJointSharedSpend(hiveId, start, end) {
  const filter = {
    hiveId: toHiveObjectId(hiveId),
    type: 'shared',
    isDeleted: false,
    ...dateFilter(start, end),
  }
  const [row] = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total || 0
}

async function aggregateSpendByCategory(matchFilter) {
  const rows = await Expense.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ])
  return rows.map((row) => ({ category: row._id, amount: row.total }))
}

async function findTopPersonalCategory(userId, start, end) {
  const filter = {
    userId,
    type: 'personal',
    isDeleted: false,
    ...dateFilter(start, end),
  }
  const rows = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ])
  return rows.length > 0 ? { category: rows[0]._id, amount: rows[0].total } : null
}

async function findTopSharedCategory(hiveId, start, end) {
  const filter = {
    hiveId: toHiveObjectId(hiveId),
    type: 'shared',
    isDeleted: false,
    ...dateFilter(start, end),
  }
  const rows = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ])
  return rows.length > 0 ? { category: rows[0]._id, amount: rows[0].total } : null
}

async function sharedContributions(hiveId, start, end) {
  const filter = {
    hiveId: toHiveObjectId(hiveId),
    type: 'shared',
    isDeleted: false,
    ...dateFilter(start, end),
  }
  const rows = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: '$userId', total: { $sum: '$amount' } } },
  ])
  return rows.map((row) => ({ userId: row._id, total: row.total }))
}

async function getBudgetStatusForBudget(budget, userId, hiveId, start, end, sharedCategories = []) {
  let personalSpent = 0
  let sharedSpent = 0

  if (budget.type === 'personal') {
    personalSpent = await sumPersonalCategorySpend(userId, budget.category, start, end)
    const categoryIsShared = sharedCategories.includes(budget.category)
    if (categoryIsShared && hiveId) {
      sharedSpent = await sumUserSharedCategorySpend(userId, hiveId, budget.category, start, end)
    }
  } else if (budget.type === 'shared' && hiveId) {
    sharedSpent = await sumSharedCategorySpend(hiveId, budget.category, start, end)
  }

  const spent = personalSpent + sharedSpent
  const limit = budget.limitAmount
  const percentUsed = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0

  return {
    id: budget._id.toString(),
    category: budget.category,
    period: budget.period,
    type: budget.type,
    limit,
    spent,
    personalSpent,
    sharedSpent,
    includesSharedPayments: budget.type === 'personal' && sharedSpent > 0,
    percentUsed,
  }
}

function serializePeriod(periodRange) {
  if (periodRange.key === 'all') {
    return { key: periodRange.key, label: periodRange.label, from: null, to: null }
  }
  return {
    key: periodRange.key,
    label: periodRange.label,
    from: periodRange.start.toISOString(),
    to: periodRange.end.toISOString(),
  }
}

async function getPersonalDashboard(userId, hiveId, periodKey = 'month') {
  const periodRange = resolvePeriodRange(periodKey)
  const { start, end } = periodRange

  const user = await User.findById(userId).lean()
  const sharedCategories = user?.sharedCategories || []

  const totalPersonalSpend = await sumPersonalSpend(userId, start, end)
  const totalSharedPaidByYou = await sumUserSharedSpend(userId, hiveId, start, end)
  const topCategory = await findTopPersonalCategory(userId, start, end)

  const personalSpendByCategory = await aggregateSpendByCategory({
    userId,
    type: 'personal',
    isDeleted: false,
    ...dateFilter(start, end),
  })

  const hivePaymentsByCategory = hiveId
    ? await aggregateSpendByCategory({
        userId,
        hiveId: toHiveObjectId(hiveId),
        type: 'shared',
        isDeleted: false,
        ...dateFilter(start, end),
      })
    : []

  const allTimePersonalSpend = await sumPersonalSpend(userId, null, null)
  const allTimeSharedPaidByYou = await sumUserSharedSpend(userId, hiveId, null, null)

  const budgets = await Budget.find({ userId, type: 'personal' }).lean()
  const budgetStatus = await Promise.all(
    budgets.map((b) => getBudgetStatusForBudget(b, userId, hiveId, start, end, sharedCategories)),
  )

  return {
    period: serializePeriod(periodRange),
    hiveId: hiveId || null,
    income: 0,
    monthlyIncome: 0,
    annualIncome: 0,
    currentBalance: -(totalPersonalSpend + totalSharedPaidByYou),
    totalPersonalSpend,
    totalSharedPaidByYou,
    totalSpendThisMonth: totalPersonalSpend,
    topCategory,
    personalSpendByCategory,
    hivePaymentsByCategory,
    budgetStatus,
    allTime: {
      totalPersonalSpend: allTimePersonalSpend,
      totalSharedPaidByYou: allTimeSharedPaidByYou,
    },
    insightPlaceholder: null,
  }
}

async function getSharedDashboard(userId, hiveId, periodKey = 'month') {
  if (!hiveId) {
    return {
      paired: false,
      period: null,
      hiveId: null,
      totalJointSpend: 0,
      totalJointSpendThisMonth: 0,
      topSharedCategory: null,
      contributions: [],
      sharedBudgetStatus: [],
      allTime: { totalJointSpend: 0 },
      message: 'No hive — pair with a partner to see shared finances.',
    }
  }

  const hive = await Hive.findById(hiveId)
  if (!hive || !hive.userIds.includes(userId)) {
    return null
  }

  const periodRange = resolvePeriodRange(periodKey)
  const { start, end } = periodRange

  const totalJointSpend = await sumJointSharedSpend(hiveId, start, end)
  const topSharedCategory = await findTopSharedCategory(hiveId, start, end)
  const sharedSpendByCategory = await aggregateSpendByCategory({
    hiveId: toHiveObjectId(hiveId),
    type: 'shared',
    isDeleted: false,
    ...dateFilter(start, end),
  })
  const contributions = await sharedContributions(hiveId, start, end)
  const allTimeJointSpend = await sumJointSharedSpend(hiveId, null, null)

  const sharedBudgets = await Budget.find({ hiveId: toHiveObjectId(hiveId), type: 'shared' }).lean()
  const sharedBudgetStatus = await Promise.all(
    sharedBudgets.map((b) => getBudgetStatusForBudget(b, userId, hiveId, start, end, [])),
  )

  return {
    paired: true,
    period: serializePeriod(periodRange),
    hiveId,
    totalJointSpend,
    totalJointSpendThisMonth: totalJointSpend,
    topSharedCategory,
    sharedSpendByCategory,
    contributions,
    sharedBudgetStatus,
    allTime: {
      totalJointSpend: allTimeJointSpend,
    },
  }
}

module.exports = {
  VALID_PERIOD_KEYS,
  utcMonthRange,
  resolvePeriodRange,
  getPersonalDashboard,
  getSharedDashboard,
}
