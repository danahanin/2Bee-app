require('../loadEnv')
const mongoose = require('mongoose')

const Hive = require('../models/Hive')
const ExpenseGroup = require('../models/ExpenseGroup')

const DEFAULT_GROUPS = ['Partner', 'Work', 'Trip', 'Household']

async function seedExpenseGroups() {
  const hives = await Hive.find({ isActive: true }).lean()

  for (const hive of hives) {
    for (const name of DEFAULT_GROUPS) {
      await ExpenseGroup.findOneAndUpdate(
        { hiveId: hive._id, name },
        {
          hiveId: hive._id,
          name,
          userIds: hive.userIds || [],
          isActive: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
    }
  }

  return { hives: hives.length, groups: hives.length * DEFAULT_GROUPS.length }
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/2bee-app'
  await mongoose.connect(uri)
  const result = await seedExpenseGroups()
  console.log(`Seeded ${result.groups} expense groups for ${result.hives} hives`)
  await mongoose.disconnect()
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error(err)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  })
}

module.exports = { seedExpenseGroups, DEFAULT_GROUPS }
