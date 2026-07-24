/**
 * Review queue for AI-derived suggestions that were saved with `needsReview: true`
 * (currently only bank-sync expenses — see jobs/transactionSync.js). The user must
 * explicitly confirm or correct each one; nothing here is auto-applied.
 */
const mongoose = require('mongoose')
const Expense = require('../../../models/Expense')
const ExpenseGroup = require('../../../models/ExpenseGroup')
const { recordExpenseConfirmationFeedback } = require('./feedback')

/**
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
async function listNeedsReview(userId) {
  return Expense.find({ userId, needsReview: true, isDeleted: false }).sort({ date: -1 }).lean()
}

function applyTypeCorrection(expense, corrections) {
  if (!corrections.type || corrections.type === expense.type) return false

  expense.type = corrections.type
  if (corrections.type === 'personal') {
    expense.hiveId = null
    expense.expenseGroupId = null
  } else if (corrections.hiveId) {
    expense.hiveId = corrections.hiveId
  }
  return true
}

function applyCategoryCorrection(expense, corrections) {
  if (!corrections.category || corrections.category === expense.category) return false
  expense.category = corrections.category
  return true
}

function applyExpenseGroupCorrection(expense, corrections) {
  if (expense.type !== 'shared' || corrections.expenseGroupId === undefined) return false
  const nextId = corrections.expenseGroupId || null
  if (String(expense.expenseGroupId || '') === String(nextId || '')) return false
  expense.expenseGroupId = nextId
  return true
}

/**
 * Confirm or correct a pending AI suggestion. `corrections` fields are only applied
 * when present, so calling this with `{}` simply accepts the suggestion as-is.
 * @param {string} userId
 * @param {string} expenseId
 * @param {{ category?: string, type?: 'personal'|'shared', hiveId?: string, expenseGroupId?: string|null }} [corrections]
 * @returns {Promise<import('mongoose').Document|null>} null when the expense isn't a pending suggestion owned by this user.
 */
async function resolveNeedsReview(userId, expenseId, corrections = {}) {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) return null

  const expense = await Expense.findOne({ _id: expenseId, userId, needsReview: true })
  if (!expense) return null

  const edits = [
    applyTypeCorrection(expense, corrections),
    applyCategoryCorrection(expense, corrections),
    applyExpenseGroupCorrection(expense, corrections),
  ]
  const wasEdited = edits.some(Boolean)

  expense.needsReview = false
  expense.classifiedBy = wasEdited ? 'user' : 'ai'
  await expense.save()

  const expenseGroup = expense.expenseGroupId
    ? await ExpenseGroup.findById(expense.expenseGroupId).lean()
    : null
  await recordExpenseConfirmationFeedback(expense, { expenseGroup })

  return expense
}

module.exports = { listNeedsReview, resolveNeedsReview }
