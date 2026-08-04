const mongoose = require('mongoose')
const fxService = require('../services/fxService')

const CATEGORIES = [
  'groceries',
  'dining',
  'transport',
  'utilities',
  'rent',
  'entertainment',
  'health',
  'shopping',
  'subscriptions',
  'travel',
  'education',
  'other',
]

const CURRENCIES = ['ILS', 'USD', 'EUR']
const BASE_CURRENCY = fxService.BASE_CURRENCY

// Snapshot of what the AI suggested at creation time, kept even after the user
// reviews the expense — lets the review UI show "AI thought X" alongside "you said Y",
// and gives the Step 6 feedback loop something to compare corrections against.
const aiSuggestionSchema = new mongoose.Schema(
  {
    category: {
      value: { type: String, default: null },
      confidence: { type: Number, default: null },
    },
    type: {
      value: { type: String, default: null },
      confidence: { type: Number, default: null },
      reasoning: { type: String, default: '' },
    },
    hive: {
      expenseGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseGroup', default: null },
      groupName: { type: String, default: null },
      confidence: { type: Number, default: null },
    },
  },
  { _id: false },
)

const expenseSchema = new mongoose.Schema(
  {
    hiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hive', default: null },
    expenseGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseGroup', default: null },
    userId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'ILS', enum: CURRENCIES },
    // Snapshot of amount converted to BASE_CURRENCY at the fx rate on entry
    // day. Frozen at creation so aggregations can `$sum` this directly
    // without re-converting historical expenses every time rates move.
    amountBase: { type: Number, default: null },
    fxRate: { type: Number, default: 1 },
    category: { type: String, required: true, enum: CATEGORIES },
    description: { type: String, required: true, maxlength: 200 },
    type: { type: String, required: true, enum: ['personal', 'shared'] },
    source: { type: String, default: 'manual', enum: ['manual', 'bank_sync', 'receipt'] },
    date: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
    classifiedBy: { type: String, enum: ['user', 'ai'], default: 'user' },
    needsReview: { type: Boolean, default: false },
    aiSuggestion: { type: aiSuggestionSchema, default: null },
    externalTransactionId: { type: String, default: null },
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt', default: null },
  },
  { timestamps: true },
)

expenseSchema.pre('validate', async function computeAmountBase() {
  if (!this.isModified('amount') && !this.isModified('currency') && this.amountBase != null) {
    return
  }

  try {
    this.fxRate = await fxService.getRate(this.currency, BASE_CURRENCY)
    this.amountBase = this.amount * this.fxRate
  } catch {
    this.fxRate = 1
    this.amountBase = this.amount
  }
})

expenseSchema.index({ needsReview: 1 })

expenseSchema.index({ userId: 1 })
expenseSchema.index({ hiveId: 1 })
expenseSchema.index({ expenseGroupId: 1 })
expenseSchema.index({ date: -1 })
expenseSchema.index({ category: 1 })
expenseSchema.index({ userId: 1, source: 1, externalTransactionId: 1 }, { sparse: true })

module.exports = mongoose.model('Expense', expenseSchema)
module.exports.CATEGORIES = CATEGORIES
module.exports.CURRENCIES = CURRENCIES
module.exports.BASE_CURRENCY = BASE_CURRENCY
