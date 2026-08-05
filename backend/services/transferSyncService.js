const mongoose = require('mongoose')
const Transfer = require('../models/Transfer')
const User = require('../models/User')
const {
  OPEN_FINANCE_SYNC_INTERVAL_MS,
  getPaymentStatus,
  isConfigured,
  normalizeTransferStatus,
} = require('./openFinanceService')
const { buildTransferNotificationPayloads } = require('./transferNotificationService')

let syncHandle = null
let syncInFlight = false

async function syncPendingTransfers() {
  if (syncInFlight || mongoose.connection.readyState !== 1 || !isConfigured()) {
    return
  }

  syncInFlight = true
  try {
    const pendingTransfers = await Transfer.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(20)
    for (const transfer of pendingTransfers) {
      try {
        const ownerId = transfer.initiatedByUserId || transfer.fromUserId
        const owner = ownerId ? await User.findById(ownerId).select('email').lean() : null
        if (!owner?.email) {
          console.warn(`Failed to sync transfer ${transfer.id}: missing owner email`)
          continue
        }
        const statusResult = await getPaymentStatus(transfer.providerTransferId, {
          openFinanceUserId: owner.email,
        })
        const nextStatus = normalizeTransferStatus(statusResult.providerStatus)
        if (nextStatus === transfer.status && transfer.providerStatus === statusResult.providerStatus) {
          continue
        }

        const previousStatus = transfer.status
        transfer.providerStatus = statusResult.providerStatus
        transfer.providerMessage = statusResult.providerMessage || transfer.providerMessage
        transfer.status = nextStatus
        if (nextStatus === 'completed') {
          transfer.completedAt = new Date()
        }
        if (nextStatus === 'cancelled') {
          transfer.cancelledAt = new Date()
        }
        if (nextStatus === 'failed') {
          transfer.failureReason = statusResult.providerMessage || transfer.failureReason
        }
        await transfer.save()

        if (previousStatus !== nextStatus) {
          await buildTransferNotificationPayloads(transfer, nextStatus)
        }
      } catch (error) {
        console.warn(`Failed to sync transfer ${transfer.id}:`, error.message)
      }
    }
  } finally {
    syncInFlight = false
  }
}

function startTransferSyncLoop() {
  if (syncHandle || !isConfigured()) {
    return
  }

  syncHandle = setInterval(() => {
    syncPendingTransfers()
  }, OPEN_FINANCE_SYNC_INTERVAL_MS)

  syncHandle.unref?.()
}

module.exports = {
  startTransferSyncLoop,
  syncPendingTransfers,
}
