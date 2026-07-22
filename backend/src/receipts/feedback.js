const mongoose = require('mongoose')
const ExpenseGroup = require('../../models/ExpenseGroup')
const { CATEGORIES } = require('../../models/Expense')
const { AppError } = require('../../utils/appError')
const { createPersonalExpense, createSharedExpense, getHiveById } = require('../../services/hiveService')
const { upsertExample } = require('../ai/rag')

function validateConfirmedExpense(expense) {
  const errors = []
  if (!expense || typeof expense !== 'object') {
    return ['expense is required']
  }
  if (typeof expense.amount !== 'number' || expense.amount <= 0) {
    errors.push('amount must be a positive number')
  }
  if (!expense.category || !CATEGORIES.includes(expense.category)) {
    errors.push(`category must be one of: ${CATEGORIES.join(', ')}`)
  }
  if (!expense.description || typeof expense.description !== 'string' || expense.description.trim().length === 0) {
    errors.push('description is required')
  }
  if (expense.description && expense.description.length > 200) {
    errors.push('description must be 200 characters or less')
  }
  if (expense.date && isNaN(Date.parse(expense.date))) {
    errors.push('date must be a valid date string')
  }
  return errors
}

function buildFeedbackText(expense, extracted = {}) {
  const lineItems = (extracted.lineItems || [])
    .map((item) => `${item.description || item.name || ''} ${item.amount || item.price || ''}`.trim())
    .filter(Boolean)
    .join(', ')

  return [
    extracted.vendor || expense.description,
    expense.category,
    `amount ${expense.amount}`,
    expense.date,
    lineItems,
    extracted.rawText?.slice(0, 300),
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function normalizeExpenseGroupId(rawGroupId) {
  if (rawGroupId == null) return null
  if (typeof rawGroupId === 'string' && rawGroupId.trim() === '') return null
  return rawGroupId
}

async function confirmReceiptDraft(user, payload) {
  const type = payload.type === 'shared' ? 'shared' : 'personal'
  const expenseData = {
    ...(payload.expense || {}),
    receiptId: payload.receiptId || payload.expense?.receiptId || null,
    classifiedBy: payload.classifiedBy || 'user',
  }
  const errors = validateConfirmedExpense(expenseData)
  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors.join('; '))
  }

  if (type === 'personal') {
    const expense = await createPersonalExpense(user.userId, expenseData)
    return { expense, feedbackStored: false, expenseGroup: null }
  }

  const hiveId = payload.hiveId || user.hiveId
  if (!hiveId) {
    throw new AppError(400, 'MISSING_HIVE', 'A hiveId is required to save a shared receipt expense')
  }

  const hive = await getHiveById(hiveId, user.userId)
  if (!hive) {
    throw new AppError(404, 'HIVE_NOT_FOUND', 'Hive not found')
  }

  const rawGroupId = normalizeExpenseGroupId(
    payload.expenseGroupId !== undefined ? payload.expenseGroupId : expenseData.expenseGroupId,
  )

  let expenseGroup = null
  if (rawGroupId != null) {
    if (!mongoose.isValidObjectId(rawGroupId)) {
      throw new AppError(400, 'INVALID_EXPENSE_GROUP', 'Choose an active hive group for this expense')
    }

    expenseGroup = await ExpenseGroup.findOne({
      _id: rawGroupId,
      hiveId,
      isActive: true,
    }).lean()

    if (!expenseGroup) {
      throw new AppError(400, 'INVALID_EXPENSE_GROUP', 'Choose an active hive group for this expense')
    }
  }

  const expense = await createSharedExpense(hiveId, user.userId, {
    ...expenseData,
    expenseGroupId: expenseGroup ? expenseGroup._id : null,
  })

  const text = buildFeedbackText(expenseData, payload.extracted || {})
  let feedbackStored = false
  if (text) {
    const metadata = {
      type: 'shared',
      source: 'dynamic',
      hiveId: String(hiveId),
      expenseId: String(expense._id),
    }
    if (expenseGroup) {
      metadata.expenseGroupId = String(expenseGroup._id)
      metadata.groupName = expenseGroup.name
    }
    try {
      await upsertExample({ text, metadata })
      feedbackStored = true
    } catch (err) {
      console.warn(
        `[receipts.confirm] RAG feedback skipped for expense ${expense._id}:`,
        err?.message || 'upsertExample failed',
      )
      feedbackStored = false
    }
  }

  return { expense, feedbackStored, expenseGroup }
}

module.exports = {
  buildFeedbackText,
  confirmReceiptDraft,
  validateConfirmedExpense,
}
