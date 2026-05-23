const mongoose = require('mongoose')
const Hive = require('../models/Hive')
const User = require('../models/User')

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'
const MOCK_BANKS = ['Leumi', 'Hapoalim', 'Discount', 'Mizrahi-Tefahot', 'ONE ZERO']

function bankNameFor(index) {
  return MOCK_BANKS[index % MOCK_BANKS.length]
}

async function seedBankMockForHive() {
  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const activeHive = await Hive.findOne({ isActive: true }).sort({ createdAt: -1 }).lean()
  if (!activeHive || !Array.isArray(activeHive.userIds) || activeHive.userIds.length === 0) {
    console.log('No active Hive found. Nothing to seed.')
    await mongoose.disconnect()
    return
  }

  const now = Date.now()
  const updates = activeHive.userIds.map(async (userId, index) => {
    const bankAccount = {
      connected: true,
      bankName: bankNameFor(index),
      lastSyncedAt: new Date(now - index * 15 * 60 * 1000),
    }

    await User.updateOne({ _id: userId }, { $set: { bankAccount } }, { upsert: false })
    const user = await User.findById(userId).lean()

    return {
      userId,
      bankName: user?.bankAccount?.bankName || bankAccount.bankName,
      lastSyncedAt: user?.bankAccount?.lastSyncedAt || bankAccount.lastSyncedAt,
    }
  })

  const results = await Promise.all(updates)

  console.log(`Seeded mock bank accounts for Hive ${activeHive._id}:`)
  results.forEach((result) => {
    console.log(`- ${result.userId}: ${result.bankName} (synced ${new Date(result.lastSyncedAt).toISOString()})`)
  })

  await mongoose.disconnect()
  console.log('Done')
}

seedBankMockForHive().catch(async (error) => {
  console.error('seedBankMockForHive failed:', error)
  try {
    await mongoose.disconnect()
  } catch {
    // noop
  }
  process.exit(1)
})
