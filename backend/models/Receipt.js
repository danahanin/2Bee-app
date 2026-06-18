const mongoose = require('mongoose')

const ocrSchema = new mongoose.Schema(
  {
    rawText: { type: String, default: '' },
    confidence: { type: Number, default: 0 },
    source: { type: String, default: 'tesseract' },
  },
  { _id: false },
)

const receiptSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    imageRef: { type: String, default: null },
    ocr: { type: ocrSchema, default: () => ({}) },
    status: { type: String, enum: ['scanned', 'confirmed', 'discarded'], default: 'scanned' },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
  },
  { timestamps: true },
)

receiptSchema.index({ userId: 1 })

module.exports = mongoose.model('Receipt', receiptSchema)
