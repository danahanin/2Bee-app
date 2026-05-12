const HiveNotification = require('../models/HiveNotification')
const Hive = require('../models/Hive')

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function titleForStatus(status) {
  switch (status) {
    case 'completed':
      return 'Transfer completed'
    case 'failed':
      return 'Transfer failed'
    case 'cancelled':
      return 'Transfer cancelled'
    default:
      return 'Transfer started'
  }
}

function messageForStatus(transfer, status, recipientUserId) {
  const amountText = formatCurrency(transfer.amount)
  const isSender = recipientUserId === transfer.fromUserId
  switch (status) {
    case 'completed':
      return isSender
        ? `Your transfer of ${amountText} was completed.`
        : `Your hive partner completed a transfer of ${amountText}.`
    case 'failed':
      return isSender
        ? `Your transfer of ${amountText} did not complete.`
        : `A hive transfer of ${amountText} did not complete.`
    case 'cancelled':
      return isSender
        ? `Your transfer of ${amountText} was cancelled.`
        : `A hive transfer of ${amountText} was cancelled.`
    default:
      return isSender
        ? `Your transfer of ${amountText} is waiting for bank confirmation.`
        : `Your hive partner started a transfer of ${amountText}.`
  }
}

async function buildTransferNotificationPayloads(transfer, status) {
  const hive = await Hive.findById(transfer.hiveId).lean()
  if (!hive?.userIds?.length) {
    return []
  }

  const docs = hive.userIds.map((userId) => ({
    hiveId: transfer.hiveId,
    userId,
    type: `transfer_${status}`,
    title: titleForStatus(status),
    message: messageForStatus(transfer, status, userId),
    relatedTransferId: transfer._id,
  }))

  return HiveNotification.insertMany(docs)
}

module.exports = {
  buildTransferNotificationPayloads,
}
