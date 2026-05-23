const Hive = require('../models/Hive')
const Expense = require('../models/Expense')
const User = require('../models/User')

function displayNameForUser(user, userId) {
  if (!user) return userId
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  return fullName || user.email || userId
}

async function getUserMap(userIds) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()

  const users = await User.find({ _id: { $in: uniqueIds } }).lean()
  return new Map(users.map((user) => [user._id, user]))
}

function decorateExpense(expense, users, currentUserId) {
  const user = users.get(expense.userId)
  return {
    ...expense,
    scope: expense.type,
    paidBy: {
      id: expense.userId,
      name: displayNameForUser(user, expense.userId),
      email: user?.email || null,
      isCurrentUser: expense.userId === currentUserId,
    },
  }
}

async function getHiveById(hiveId, userId) {
  const hive = await Hive.findById(hiveId)
  if (!hive) return null
  if (!hive.userIds.includes(userId)) return null
  return hive
}

async function getHiveExpenses(hiveId, { category, from, to, page = 1, limit = 20, currentUserId }) {
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
  const users = await getUserMap(expenses.map((expense) => expense.userId))

  return {
    expenses: expenses.map((expense) => decorateExpense(expense, users, currentUserId)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
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

async function updateSharedExpense(hiveId, expenseId, userId, data) {
  const expense = await Expense.findOne({
    _id: expenseId,
    hiveId,
    type: 'shared',
    isDeleted: false,
  })
  if (!expense) return null

  const allowedFields = ['amount', 'category', 'description', 'date']
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      expense[field] = field === 'date' ? new Date(data[field]) : data[field]
    }
  }

  return expense.save()
}

async function deleteSharedExpense(hiveId, expenseId) {
  const expense = await Expense.findOne({
    _id: expenseId,
    hiveId,
    type: 'shared',
    isDeleted: false,
  })
  if (!expense) return null

  expense.isDeleted = true
  return expense.save()
}

async function getPersonalExpenses(userId, { category, from, to, page = 1, limit = 20 }) {
  const activeHives = await Hive.find({ userIds: userId, isActive: true }).select('_id').lean()
  const hiveIds = activeHives.map((hive) => hive._id)
  const filter = {
    isDeleted: false,
    $or: [
      { userId, type: 'personal' },
      ...(hiveIds.length > 0 ? [{ hiveId: { $in: hiveIds }, type: 'shared' }] : []),
    ],
  }

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
  const users = await getUserMap([...expenses.map((expense) => expense.userId), userId])

  return {
    expenses: expenses.map((expense) => decorateExpense(expense, users, userId)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    includesShared: hiveIds.length > 0,
  }
}

async function getHiveBalance(hiveId, currentUserId) {
  const hive = await getHiveById(hiveId, currentUserId)
  if (!hive) return null

  const expenses = await Expense.find({ hiveId, type: 'shared', isDeleted: false }).lean()
  const userIds = hive.userIds
  const users = await getUserMap(userIds)
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const share = userIds.length > 0 ? total / userIds.length : 0
  const paidByUser = new Map(userIds.map((userId) => [userId, 0]))

  for (const expense of expenses) {
    paidByUser.set(expense.userId, (paidByUser.get(expense.userId) || 0) + expense.amount)
  }

  const participants = userIds.map((userId) => {
    const paid = paidByUser.get(userId) || 0
    return {
      id: userId,
      name: displayNameForUser(users.get(userId), userId),
      paid,
      share,
      balance: paid - share,
      isCurrentUser: userId === currentUserId,
    }
  })

  const creditors = participants
    .filter((participant) => participant.balance > 0.005)
    .map((participant) => ({ ...participant }))
  const debtors = participants
    .filter((participant) => participant.balance < -0.005)
    .map((participant) => ({ ...participant, balance: Math.abs(participant.balance) }))
  const settlements = []

  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (debtor.balance <= 0.005) break
      if (creditor.balance <= 0.005) continue

      const amount = Math.min(debtor.balance, creditor.balance)
      settlements.push({
        from: { id: debtor.id, name: debtor.name, isCurrentUser: debtor.isCurrentUser },
        to: { id: creditor.id, name: creditor.name, isCurrentUser: creditor.isCurrentUser },
        amount,
      })
      debtor.balance -= amount
      creditor.balance -= amount
    }
  }

  return {
    totalSharedSpend: total,
    splitAmount: share,
    participants,
    settlements,
  }
}

module.exports = {
  getHiveById,
  getHiveExpenses,
  getHiveBalance,
  createSharedExpense,
  updateSharedExpense,
  deleteSharedExpense,
  getPersonalExpenses,
}
