const mongoose = require('mongoose')
const User = require('../models/User')

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'
const MOCK_PARTNER_ID = 'user_mock_partner'
const MOCK_PAIR_CODE = 'BEE123'

async function seedPairMock() {
  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const now = new Date()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await User.updateOne(
    { _id: MOCK_PARTNER_ID },
    {
      $set: {
        email: 'mock.partner@2bee.app',
        emailLower: 'mock.partner@2bee.app',
        passwordHash: 'seeded-demo-partner',
        firstName: 'Mock',
        lastName: 'Partner',
        pairId: null,
        hiveId: null,
        pairCode: MOCK_PAIR_CODE,
        pairCodeExpiresAt: expiresAt,
        pairCodeUsedAt: null,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  )

  const doc = await User.findById(MOCK_PARTNER_ID).lean()
  console.log('Mock partner ready:')
  console.log(`- id: ${doc._id}`)
  console.log(`- email: ${doc.email}`)
  console.log(`- pairCode: ${doc.pairCode}`)
  console.log(`- pairCodeExpiresAt: ${doc.pairCodeExpiresAt.toISOString()}`)

  await mongoose.disconnect()
  console.log('Done')
}

seedPairMock().catch(async (error) => {
  console.error('seedPairMock failed:', error)
  try {
    await mongoose.disconnect()
  } catch {
    // noop
  }
  process.exit(1)
})
