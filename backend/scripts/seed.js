const mongoose = require('mongoose')
const Hive = require('../models/Hive')
const Expense = require('../models/Expense')

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'

const DEMO_USER_A = 'user_demo_1'
const DEMO_USER_B = 'user_demo_2'

const sharedExpenses = [
  { amount: 320, category: 'groceries', description: 'Weekly groceries at Shufersal', userId: DEMO_USER_A },
  { amount: 180, category: 'dining', description: 'Dinner at Ouzeria', userId: DEMO_USER_B },
  { amount: 450, category: 'utilities', description: 'Electricity bill March', userId: DEMO_USER_A },
  { amount: 95, category: 'subscriptions', description: 'Netflix + Spotify', userId: DEMO_USER_B },
  { amount: 260, category: 'groceries', description: 'Groceries at Rami Levy', userId: DEMO_USER_B },
  { amount: 75, category: 'transport', description: 'Uber to airport', userId: DEMO_USER_A },
  { amount: 150, category: 'entertainment', description: 'Concert tickets', userId: DEMO_USER_A },
  { amount: 200, category: 'dining', description: 'Brunch at Benedict', userId: DEMO_USER_B },
]

const personalExpenses = [
  { amount: 120, category: 'shopping', description: 'New running shoes', userId: DEMO_USER_A },
  { amount: 45, category: 'health', description: 'Pharmacy', userId: DEMO_USER_A },
  { amount: 300, category: 'education', description: 'Online course subscription', userId: DEMO_USER_A },
  { amount: 80, category: 'entertainment', description: 'Book store', userId: DEMO_USER_A },
]

async function seed() {
  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  await Hive.deleteMany({})
  await Expense.deleteMany({})
  console.log('Cleared existing data')

  const hive = await Hive.create({ userIds: [DEMO_USER_A, DEMO_USER_B] })
  console.log(`Created Hive: ${hive._id}`)

  const now = new Date()
  const sharedDocs = sharedExpenses.map((e, i) => ({
    ...e,
    hiveId: hive._id,
    type: 'shared',
    source: 'manual',
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 2),
    classifiedBy: 'user',
  }))

  const personalDocs = personalExpenses.map((e, i) => ({
    ...e,
    hiveId: null,
    type: 'personal',
    source: 'manual',
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 3),
    classifiedBy: 'user',
  }))

  await Expense.insertMany([...sharedDocs, ...personalDocs])
  console.log(`Seeded ${sharedDocs.length} shared + ${personalDocs.length} personal expenses`)
  console.log(`\nHive ID for testing: ${hive._id}`)

  await mongoose.disconnect()
  console.log('Done')
}

seed().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
