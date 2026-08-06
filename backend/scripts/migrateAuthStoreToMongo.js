require('../loadEnv')
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const User = require('../models/User')

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'
const STORE_FILE = path.join(__dirname, '..', 'data', 'auth-store.json')

async function migrate() {
  if (!fs.existsSync(STORE_FILE)) {
    console.log(`No legacy auth store found at ${STORE_FILE} — nothing to migrate.`)
    return
  }

  const raw = fs.readFileSync(STORE_FILE, 'utf-8')
  const parsed = JSON.parse(raw || '{}')
  const users = Array.isArray(parsed.users) ? parsed.users : []

  if (users.length === 0) {
    console.log('Legacy auth store has no users — nothing to migrate.')
    return
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  for (const user of users) {
    await User.updateOne(
      { _id: user.id },
      {
        $set: {
          email: user.email,
          emailLower: user.emailLower,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        $setOnInsert: {
          pairId: user.pairId ?? null,
          hiveId: user.hiveId ?? null,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        },
      },
      { upsert: true },
    )
    console.log(`Migrated ${user.email} (${user.id})`)
  }

  console.log(
    `\nMigrated ${users.length} user(s). Sessions and refresh tokens were not migrated — ` +
      'affected users will need to log in again. Once verified, delete backend/data/auth-store.json.',
  )

  await mongoose.disconnect()
}

migrate().catch(async (error) => {
  console.error('Migration failed:', error)
  try {
    await mongoose.disconnect()
  } catch {
  }
  process.exit(1)
})
