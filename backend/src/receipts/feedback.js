const ExpenseGroup = require('../../models/ExpenseGroup')
const { CATEGORIES } = require('../../models/Expense')
const { AppError } = require('../../utils/appError')
const { createPersonalExpense, createSharedExpense, getHiveById } = require('../../services/hiveService')
const { recordExpenseConfirmationFeedback } = require('../ai/classification/feedback')

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

  const extracted = payload.extracted || {}
  const sourceDetails = { vendor: extracted.vendor, rawText: extracted.rawText, lineItems: extracted.lineItems }

  if (type === 'personal') {
    const expense = await createPersonalExpense(user.userId, expenseData)
    const { personalOrShared } = await recordExpenseConfirmationFeedback(expense, sourceDetails)
    return { expense, feedbackStored: personalOrShared }
  }

  const hiveId = payload.hiveId || user.hiveId
  if (!hiveId) {
    throw new AppError(400, 'MISSING_HIVE', 'A hiveId is required to save a shared receipt expense')
  }

  const hive = await getHiveById(hiveId, user.userId)
  if (!hive) {
    throw new AppError(404, 'HIVE_NOT_FOUND', 'Hive not found')
  }

  let expenseGroup = null
  const expenseGroupId = payload.expenseGroupId || expenseData.expenseGroupId
  if (expenseGroupId) {
    expenseGroup = await ExpenseGroup.findOne({
      _id: expenseGroupId,
      hiveId,
      isActive: true,
    }).lean()
    if (!expenseGroup) {
      throw new AppError(400, 'INVALID_EXPENSE_GROUP', 'Choose an active hive group for this expense')
    }
  }

  const expense = await createSharedExpense(hiveId, user.userId, {
    ...expenseData,
    expenseGroupId: expenseGroup?._id || null,
  })

  const feedback = await recordExpenseConfirmationFeedback(expense, { ...sourceDetails, expenseGroup })

  return { expense, feedbackStored: feedback.personalOrShared || feedback.hive, expenseGroup }
}

module.exports = {
  confirmReceiptDraft,
  validateConfirmedExpense,
}
