const mongoose = require('mongoose')

const hiveSchema = new mongoose.Schema(
  {
    userIds: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => v.length === 2,
        message: 'A Hive must have exactly 2 users',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

hiveSchema.index({ userIds: 1 })

module.exports = mongoose.model('Hive', hiveSchema)
