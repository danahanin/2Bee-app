const mongoose = require('mongoose')
const { CATEGORIES } = require('./Expense')

const PERIODS = ['monthly', 'weekly', 'yearly']
const BUDGET_TYPES = ['personal', 'shared']

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    hiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hive', default: null, index: true },
    category: { type: String, required: true, enum: CATEGORIES },
    limitAmount: { type: Number, required: true, min: 0.01 },
    period: { type: String, required: true, enum: PERIODS, default: 'monthly' },
    type: { type: String, required: true, enum: BUDGET_TYPES },
  },
  { timestamps: true },
)

budgetSchema.index({ userId: 1, category: 1, type: 1 })

module.exports = mongoose.model('Budget', budgetSchema)
module.exports.PERIODS = PERIODS
module.exports.BUDGET_TYPES = BUDGET_TYPES
