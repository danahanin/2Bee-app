const { makeExpenseSignal, fromExtractedReceipt, fromManualExpense, fromBankTransaction } = require('./expenseSignal')
const { classifyCategory } = require('./classifyCategory')
const { classifyPersonalOrShared } = require('./classifyPersonalOrShared')
const { classifyExpense } = require('./classifyExpense')
const {
  buildFeedbackText,
  recordPersonalOrSharedFeedback,
  recordHiveFeedback,
  recordExpenseConfirmationFeedback,
} = require('./feedback')

module.exports = {
  makeExpenseSignal,
  fromExtractedReceipt,
  fromManualExpense,
  fromBankTransaction,
  classifyCategory,
  classifyPersonalOrShared,
  classifyExpense,
  buildFeedbackText,
  recordPersonalOrSharedFeedback,
  recordHiveFeedback,
  recordExpenseConfirmationFeedback,
}
