const mongoose = require('mongoose')

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

const expenseSchema = new mongoose.Schema(
  {
    hiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hive', default: null },
    userId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true, enum: CATEGORIES },
    description: { type: String, required: true, maxlength: 200 },
    type: { type: String, required: true, enum: ['personal', 'shared'] },
    source: { type: String, default: 'manual', enum: ['manual', 'bank_sync'] },
    date: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
    classifiedBy: { type: String, enum: ['user', 'ai'], default: 'user' },
  },
  { timestamps: true },
)

expenseSchema.index({ userId: 1 })
expenseSchema.index({ hiveId: 1 })
expenseSchema.index({ date: -1 })
expenseSchema.index({ category: 1 })

module.exports = mongoose.model('Expense', expenseSchema)
module.exports.CATEGORIES = CATEGORIES
