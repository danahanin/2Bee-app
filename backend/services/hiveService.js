const Hive = require('../models/Hive')
const Expense = require('../models/Expense')

async function getHiveById(hiveId, userId) {
  const hive = await Hive.findById(hiveId)
  if (!hive) return null
  if (!hive.userIds.includes(userId)) return null
  return hive
}

async function getHiveExpenses(hiveId, { category, from, to, page = 1, limit = 20 }) {
  const filter = { hiveId, type: 'shared', isDeleted: false }

  if (category) filter.category = category
  if (from || to) {
    filter.date = {}
    if (from) filter.date.$gte = new Date(from)
    if (to) filter.date.$lte = new Date(to)
  }

  const skip = (page - 1) * limit
  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Expense.countDocuments(filter),
  ])

  return { expenses, total, page, limit, totalPages: Math.ceil(total / limit) }
}

async function createSharedExpense(hiveId, userId, data) {
  const expense = new Expense({
    hiveId,
    userId,
    amount: data.amount,
    category: data.category,
    description: data.description,
    type: 'shared',
    source: 'manual',
    date: data.date || new Date(),
    classifiedBy: 'user',
  })
  return expense.save()
}

async function getPersonalExpenses(userId, { category, from, to, page = 1, limit = 20 }) {
  const filter = { userId, type: 'personal', isDeleted: false }

  if (category) filter.category = category
  if (from || to) {
    filter.date = {}
    if (from) filter.date.$gte = new Date(from)
    if (to) filter.date.$lte = new Date(to)
  }

  const skip = (page - 1) * limit
  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Expense.countDocuments(filter),
  ])

  return { expenses, total, page, limit, totalPages: Math.ceil(total / limit) }
}

module.exports = {
  getHiveById,
  getHiveExpenses,
  createSharedExpense,
  getPersonalExpenses,
}
