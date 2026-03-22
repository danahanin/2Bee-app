const mongoose = require('mongoose')
const { CATEGORIES } = require('./Expense')

const goalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    hiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hive', default: null, index: true },
    title: { type: String, required: true, maxlength: 120 },
    targetAmount: { type: Number, required: true, min: 0.01 },
    currentAmount: { type: Number, required: true, min: 0, default: 0 },
    deadline: { type: Date, required: true },
    category: { type: String, enum: CATEGORIES },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Goal', goalSchema)
