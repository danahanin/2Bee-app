const mongoose = require('mongoose')

const TRANSFER_STATUSES = ['pending', 'completed', 'failed', 'cancelled']
const TRANSFER_SOURCES = ['open_finance']
const PROVIDER_STATUS_TERMINAL = ['ACCC', 'ACSC', 'RJCT', 'ERROR', 'CANC']

const transferSchema = new mongoose.Schema(
  {
    hiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hive', required: true, index: true },
    fromUserId: { type: String, required: true, index: true },
    toUserId: { type: String, required: true, index: true },
    initiatedByUserId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, default: 'ILS' },
    status: { type: String, required: true, enum: TRANSFER_STATUSES, default: 'pending', index: true },
    source: { type: String, required: true, enum: TRANSFER_SOURCES, default: 'open_finance' },
    date: { type: Date, required: true, default: Date.now },
    providerId: { type: String, required: true },
    providerTransferId: { type: String, required: true, unique: true, index: true },
    providerStatus: { type: String, default: 'INIT' },
    providerMessage: { type: String, default: '' },
    failureReason: { type: String, default: '' },
    payUrl: { type: String, default: '' },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
)

transferSchema.index({ hiveId: 1, date: -1 })

module.exports = mongoose.model('Transfer', transferSchema)
module.exports.TRANSFER_STATUSES = TRANSFER_STATUSES
module.exports.TRANSFER_SOURCES = TRANSFER_SOURCES
module.exports.PROVIDER_STATUS_TERMINAL = PROVIDER_STATUS_TERMINAL
