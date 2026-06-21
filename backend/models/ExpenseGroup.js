const mongoose = require('mongoose')

const expenseGroupSchema = new mongoose.Schema(
  {
    hiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hive', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    userIds: { type: [String], required: true, default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

expenseGroupSchema.index({ hiveId: 1, name: 1 }, { unique: true })
expenseGroupSchema.index({ hiveId: 1, isActive: 1 })

module.exports = mongoose.model('ExpenseGroup', expenseGroupSchema)
