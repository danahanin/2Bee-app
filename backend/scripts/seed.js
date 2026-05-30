const mongoose = require('mongoose')
const Hive = require('../models/Hive')
const Expense = require('../models/Expense')
const Budget = require('../models/Budget')
const Goal = require('../models/Goal')
const Transfer = require('../models/Transfer')
const HiveNotification = require('../models/HiveNotification')
const User = require('../models/User')

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

function generateHistoricalExpenses(userId, hiveId) {
  const now = new Date()
  const expenses = []
  
  const categories = ['groceries', 'dining', 'transport', 'utilities', 'entertainment', 'shopping', 'subscriptions']
  const baseAmounts = {
    groceries: [200, 250, 280, 300, 320],
    dining: [80, 100, 150, 120, 180],
    transport: [50, 75, 60, 80, 100],
    utilities: [350, 380, 400, 420, 450],
    entertainment: [60, 80, 100, 120, 150],
    shopping: [100, 150, 200, 180, 250],
    subscriptions: [50, 55, 55, 55, 55],
  }
  
  for (let monthsAgo = 1; monthsAgo <= 4; monthsAgo++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    
    for (const category of categories) {
      const amounts = baseAmounts[category]
      const baseAmount = amounts[Math.min(monthsAgo - 1, amounts.length - 1)]
      const variance = Math.floor(Math.random() * 40) - 20
      const amount = baseAmount + variance
      
      expenses.push({
        userId,
        hiveId: null,
        amount,
        category,
        description: `${category} expense`,
        type: 'personal',
        source: 'manual',
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5 + Math.floor(Math.random() * 20)),
        classifiedBy: 'user',
      })
    }
  }
  
  expenses.push({
    userId,
    hiveId: null,
    amount: 800,
    category: 'dining',
    description: 'Fancy restaurant dinner',
    type: 'personal',
    source: 'manual',
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
    classifiedBy: 'user',
  })
  
  for (let monthsAgo = 0; monthsAgo <= 3; monthsAgo++) {
    expenses.push({
      userId,
      hiveId: null,
      amount: 49.99,
      category: 'subscriptions',
      description: 'Spotify Premium',
      type: 'personal',
      source: 'manual',
      date: new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15),
      classifiedBy: 'user',
    })
  }
  
  expenses.push(
    {
      userId,
      hiveId: null,
      amount: 450,
      category: 'dining',
      description: 'Dinner party',
      type: 'personal',
      source: 'manual',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      classifiedBy: 'user',
    },
    {
      userId,
      hiveId: null,
      amount: 380,
      category: 'dining',
      description: 'Birthday dinner',
      type: 'personal',
      source: 'manual',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14),
      classifiedBy: 'user',
    }
  )
  
  return expenses
}

async function seed() {
  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  await Hive.deleteMany({})
  await Expense.deleteMany({})
  await Budget.deleteMany({})
  await Goal.deleteMany({})
  await Transfer.deleteMany({})
  await HiveNotification.deleteMany({})
  console.log('Cleared existing data')

  const hive = await Hive.create({ userIds: [DEMO_USER_A, DEMO_USER_B] })
  console.log(`Created Hive: ${hive._id}`)

  await User.updateOne(
    { _id: DEMO_USER_A },
    {
      $set: {
        email: 'demo@2bee.app',
        emailLower: 'demo@2bee.app',
        passwordHash: 'seeded-auth-store-user',
        firstName: 'Demo',
        lastName: 'User',
        pairId: DEMO_USER_B,
        hiveId: hive._id.toString(),
      },
    },
    { upsert: true },
  )
  await User.updateOne(
    { _id: DEMO_USER_B },
    {
      $set: {
        email: 'partner@2bee.app',
        emailLower: 'partner@2bee.app',
        passwordHash: 'seeded-demo-partner',
        firstName: 'Partner',
        lastName: 'User',
        pairId: DEMO_USER_A,
        hiveId: hive._id.toString(),
      },
    },
    { upsert: true },
  )

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

  const historicalExpenses = generateHistoricalExpenses(DEMO_USER_A, hive._id)
  
  await Expense.insertMany([...sharedDocs, ...personalDocs, ...historicalExpenses])
  console.log(`Seeded ${sharedDocs.length} shared + ${personalDocs.length} personal + ${historicalExpenses.length} historical expenses`)

  const nextYear = new Date(now.getFullYear() + 1, 11, 31)
  await Budget.insertMany([
    {
      userId: DEMO_USER_A,
      hiveId: null,
      category: 'dining',
      limitAmount: 400,
      period: 'monthly',
      type: 'personal',
    },
    {
      userId: DEMO_USER_A,
      hiveId: hive._id,
      category: 'groceries',
      limitAmount: 900,
      period: 'monthly',
      type: 'shared',
    },
  ])
  await Goal.insertMany([
    {
      userId: DEMO_USER_A,
      hiveId: hive._id,
      title: 'Vacation fund',
      targetAmount: 8000,
      currentAmount: 1200,
      deadline: nextYear,
      category: 'travel',
    },
  ])
  console.log('Seeded sample budgets and goals')

  console.log(`\nHive ID for testing: ${hive._id}`)

  await mongoose.disconnect()
  console.log('Done')
}

seed().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
