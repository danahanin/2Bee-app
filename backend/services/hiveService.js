const Hive = require('../models/Hive')
const Expense = require('../models/Expense')
const Transfer = require('../models/Transfer')
const HiveNotification = require('../models/HiveNotification')
const { AppError } = require('../utils/appError')
const { createPayment } = require('./openFinanceService')
const { buildTransferNotificationPayloads } = require('./transferNotificationService')

function roundAmount(value) {
  return Number((value || 0).toFixed(2))
}

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

async function calculateHiveBalance(hiveId) {
  const hive = await Hive.findById(hiveId).lean()
  if (!hive) return null

  const memberIds = hive.userIds || []
  const sharedExpenses = await Expense.find({ hiveId, type: 'shared', isDeleted: false }).lean()
  const completedTransfers = await Transfer.find({ hiveId, status: 'completed' }).lean()

  const paidByUser = Object.fromEntries(memberIds.map((userId) => [userId, 0]))
  for (const expense of sharedExpenses) {
    if (paidByUser[expense.userId] === undefined) {
      paidByUser[expense.userId] = 0
    }
    paidByUser[expense.userId] += expense.amount
  }

  const totalSharedSpend = roundAmount(sharedExpenses.reduce((sum, expense) => sum + expense.amount, 0))
  const equalShare = memberIds.length > 0 ? roundAmount(totalSharedSpend / memberIds.length) : 0

  const settledByUser = Object.fromEntries(memberIds.map((userId) => [userId, 0]))
  for (const transfer of completedTransfers) {
    if (settledByUser[transfer.fromUserId] !== undefined) {
      settledByUser[transfer.fromUserId] += transfer.amount
    }
    if (settledByUser[transfer.toUserId] !== undefined) {
      settledByUser[transfer.toUserId] -= transfer.amount
    }
  }

  const contributions = memberIds.map((userId) => {
    const paid = roundAmount(paidByUser[userId] || 0)
    const net = roundAmount(paid - equalShare)
    const settled = roundAmount(settledByUser[userId] || 0)
    const remainingNet = roundAmount(net + settled)
    return {
      userId,
      paid,
      expectedShare: equalShare,
      net,
      settled,
      remainingNet,
    }
  })

  const sortedByRemaining = [...contributions].sort((a, b) => b.remainingNet - a.remainingNet)
  const mostAhead = sortedByRemaining[0] || null
  const mostBehind = sortedByRemaining[sortedByRemaining.length - 1] || null

  let suggestedTransfer = null
  let remainingImbalance = 0
  if (mostAhead && mostBehind && mostAhead.remainingNet > 0.01 && mostBehind.remainingNet < -0.01) {
    remainingImbalance = roundAmount(Math.min(mostAhead.remainingNet, Math.abs(mostBehind.remainingNet)))
    suggestedTransfer = {
      fromUserId: mostBehind.userId,
      toUserId: mostAhead.userId,
      amount: remainingImbalance,
    }
  }

  return {
    hiveId: String(hive._id),
    totalSharedSpend,
    equalShare,
    contributions,
    completedTransfersTotal: roundAmount(completedTransfers.reduce((sum, transfer) => sum + transfer.amount, 0)),
    remainingImbalance,
    balanceStatus: remainingImbalance > 0.01 ? 'imbalanced' : 'balanced',
    suggestedTransfer,
  }
}

async function getHiveTransfers(hiveId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    Transfer.find({ hiveId }).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Transfer.countDocuments({ hiveId }),
  ])

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}

async function getHiveNotifications(hiveId, userId, { limit = 10 }) {
  const items = await HiveNotification.find({ hiveId, userId }).sort({ createdAt: -1 }).limit(limit).lean()
  return { items }
}

async function createHiveTransfer(hiveId, user, data) {
  const balance = await calculateHiveBalance(hiveId)
  if (!balance?.suggestedTransfer) {
    throw new AppError(409, 'HIVE_ALREADY_BALANCED', 'Your hive is already balanced.')
  }

  if (balance.suggestedTransfer.fromUserId !== user.userId) {
    throw new AppError(
      403,
      'TRANSFER_NOT_AVAILABLE',
      'This transfer can only be started by the partner who has paid less so far.'
    )
  }

  const requestedAmount = roundAmount(data.amount)
  if (requestedAmount > balance.suggestedTransfer.amount) {
    throw new AppError(
      400,
      'TRANSFER_AMOUNT_TOO_HIGH',
      'Transfer amount cannot be higher than the remaining hive imbalance.'
    )
  }

  const transferDate = data.date ? new Date(data.date) : new Date()
  const description = `Hive balance transfer for ${transferDate.toLocaleDateString('en-IL')}`
  const payment = await createPayment({
    amount: requestedAmount,
    description,
    providerId: data.providerId,
    psuId: data.psuId,
    debtorAccountType: data.debtorAccountType,
    debtorAccountNumber: data.debtorAccountNumber,
    debtorName: data.debtorName || `${user.firstName} ${user.lastName}`.trim(),
    creditorAccountType: data.creditorAccountType,
    creditorAccountNumber: data.creditorAccountNumber,
    creditorName: data.creditorName,
    includeFakeProviders: Boolean(data.includeFakeProviders),
    redirectUrl: data.redirectUrl || null,
  })

  const transfer = await Transfer.create({
    hiveId,
    fromUserId: balance.suggestedTransfer.fromUserId,
    toUserId: balance.suggestedTransfer.toUserId,
    initiatedByUserId: user.userId,
    amount: requestedAmount,
    currency: 'ILS',
    status: 'pending',
    source: 'open_finance',
    date: transferDate,
    providerId: data.providerId,
    providerTransferId: payment.paymentId,
    providerStatus: payment.providerStatus,
    providerMessage: '',
    payUrl: payment.payUrl || '',
  })

  await buildTransferNotificationPayloads(transfer, 'pending')
  return { transfer: transfer.toObject(), payUrl: payment.payUrl || '' }
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
  updateSharedExpense,
  deleteSharedExpense,
  calculateHiveBalance,
  getHiveTransfers,
  getHiveNotifications,
  createHiveTransfer,
  getPersonalExpenses,
}
