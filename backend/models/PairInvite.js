const mongoose = require('mongoose')

const pairInviteSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    inviterUserId: { type: String, required: true, index: true },
    hiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hive', required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

pairInviteSchema.index({ inviterUserId: 1, hiveId: 1, expiresAt: -1 })

module.exports = mongoose.model('PairInvite', pairInviteSchema)
