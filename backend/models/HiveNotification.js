const mongoose = require('mongoose')

const NOTIFICATION_TYPES = [
  'transfer_pending',
  'transfer_completed',
  'transfer_failed',
  'transfer_cancelled',
]

const hiveNotificationSchema = new mongoose.Schema(
  {
    hiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hive', required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 240 },
    relatedTransferId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transfer', default: null },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

hiveNotificationSchema.index({ hiveId: 1, userId: 1, createdAt: -1 })

module.exports = mongoose.model('HiveNotification', hiveNotificationSchema)
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES
