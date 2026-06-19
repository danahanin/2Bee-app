const mongoose = require('mongoose')

const classificationExampleSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    type: { type: String, enum: ['personal', 'shared'], required: true },
    embedding: { type: [Number], required: true },
    source: { type: String, enum: ['const', 'dynamic'], default: 'const' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
)

classificationExampleSchema.index({ type: 1 })
classificationExampleSchema.index({ text: 1, type: 1 })

module.exports = mongoose.model('ClassificationExample', classificationExampleSchema)
