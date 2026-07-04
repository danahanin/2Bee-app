require('dotenv').config()
const mongoose = require('mongoose')
const { guessCategory } = require('../src/categoryGuess')
const Hive = require('../models/Hive')
const Expense = require('../models/Expense')
const Budget = require('../models/Budget')
const Goal = require('../models/Goal')
const Transfer = require('../models/Transfer')
const HiveNotification = require('../models/HiveNotification')
const User = require('../models/User')

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'

const OPEN_FINANCE_API_URL = process.env.OPEN_FINANCE_API_URL || 'https://api.open-finance.ai'
const OPEN_FINANCE_CLIENT_ID = process.env.OPEN_FINANCE_CLIENT_ID || ''
const OPEN_FINANCE_CLIENT_SECRET = process.env.OPEN_FINANCE_CLIENT_SECRET || ''

const DEMO_USER_A = 'user_demo_1'
const DEMO_USER_B = 'user_demo_2'

const DAYS_TO_FETCH = 90

function isConfigured() {
  return Boolean(OPEN_FINANCE_CLIENT_ID && OPEN_FINANCE_CLIENT_SECRET)
}

async function getAccessToken(userId) {
  const response = await fetch(`${OPEN_FINANCE_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      clientId: OPEN_FINANCE_CLIENT_ID,
      clientSecret: OPEN_FINANCE_CLIENT_SECRET,
    }),
  })

  const payload = await response.json()
  if (!response.ok || !payload?.accessToken) {
    throw new Error(payload?.message || 'Failed to get access token')
  }
  return payload.accessToken
}

async function fetchTransactionsForUser(userId) {
  const token = await getAccessToken(userId)
  
  const url = `${OPEN_FINANCE_API_URL}/v2/data/transactions?limit=500`
  
  console.log(`Fetching transactions for user ${userId}...`)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to fetch transactions')
  }

  const transactions = payload?.items || payload?.transactions || payload?.booked || payload || []
  return Array.isArray(transactions) ? transactions : []
}

function mapCategory(rawCategory) {
  const map = {
    food: 'groceries',
    supermarket: 'groceries',
    restaurant: 'dining',
    cafe: 'dining',
    fuel: 'transport',
    taxi: 'transport',
    bus: 'transport',
    electricity: 'utilities',
    water: 'utilities',
    gas: 'utilities',
    internet: 'utilities',
    medical: 'health',
    pharmacy: 'health',
    clothing: 'shopping',
    hotel: 'travel',
    flight: 'travel',
    education: 'education',
    gym: 'entertainment',
    cinema: 'entertainment',
    streaming: 'subscriptions',
  }
  const lower = (rawCategory || '').toLowerCase().trim()
  return map[lower] || 'other'
}

const SHARED_CATEGORIES = ['groceries', 'rent', 'utilities', 'dining']
const ALL_CATEGORIES = ['groceries', 'dining', 'transport', 'utilities', 'entertainment', 'shopping', 'subscriptions', 'health', 'travel', 'other']

const REALISTIC_AMOUNTS = {
  groceries: { min: 50, max: 400 },
  dining: { min: 40, max: 250 },
  transport: { min: 15, max: 150 },
  utilities: { min: 100, max: 600 },
  entertainment: { min: 30, max: 200 },
  shopping: { min: 50, max: 500 },
  subscriptions: { min: 20, max: 100 },
  health: { min: 30, max: 300 },
  travel: { min: 100, max: 1500 },
  rent: { min: 3000, max: 6000 },
  other: { min: 20, max: 300 },
}

function normalizeAmount(amount, category) {
  const range = REALISTIC_AMOUNTS[category] || REALISTIC_AMOUNTS.other
  if (amount >= range.min && amount <= range.max * 2) {
    return amount
  }
  return range.min + Math.random() * (range.max - range.min)
}

function getTransactionDate(tx) {
  const raw =
    tx.date?.transactionDate ||
    tx.date?.bookingDate ||
    tx.date?.valueDate ||
    tx.bookingDate ||
    tx.valueDate
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function monthIndex(date) {
  return date.getUTCFullYear() * 12 + date.getUTCMonth()
}

// Sandbox transactions are dated in the past (and sometimes future). The AI
// analyzes only the most recent months, so we shift every transaction by a
// whole number of months such that the newest non-future transaction lands in
// the current month. This keeps real amounts/spacing while making the data recent.
function computeMonthShift(transactions, now) {
  const nowIndex = monthIndex(now)
  const pastMonthIndexes = transactions
    .map(getTransactionDate)
    .filter((date) => date && date.getTime() <= now.getTime())
    .map(monthIndex)
  if (pastMonthIndexes.length === 0) return 0
  const newestPastIndex = Math.max(...pastMonthIndexes)
  return nowIndex - newestPastIndex
}

function shiftDateByMonths(date, months) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 12, 0, 0),
  )
}

function transformTransactions(transactions, userId, hiveId) {
  const expenses = []
  const now = new Date()
  const monthShift = computeMonthShift(transactions, now)

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    const rawAmount = tx.amount?.originalAmount?.amount || tx.amount?.chargedAmount?.amount || tx.amount || 0
    const numAmount = Number(rawAmount) || 0
    
    if (numAmount >= 0) continue
    
    const amount = Math.abs(numAmount)
    if (amount <= 0) continue

    const description = 
      tx.description?.description || 
      tx.remittanceInformation || 
      tx.creditorName || 
      tx.debtorName ||
      tx.securityDetails?.financialInstrument?.name ||
      'Bank transaction'

    const rawCategory = tx.category?.main || tx.category?.sub || tx.category || tx.merchantCategoryCode || ''
    let category = mapCategory(rawCategory)
    
    if (category === 'other') {
      const guessed = guessCategory(description)
      if (guessed) {
        category = guessed
      } else {
        category = ALL_CATEGORIES[i % ALL_CATEGORIES.length]
      }
    }

    const externalId = tx.id || tx.transactionId || null
    const txDate = getTransactionDate(tx)
    const shiftedDate = txDate ? shiftDateByMonths(txDate, monthShift) : now

    if (shiftedDate.getTime() > now.getTime()) continue

    const isShared = SHARED_CATEGORIES.includes(category)

    const normalizedAmount = Math.round(normalizeAmount(amount, category) * 100) / 100

    expenses.push({
      userId,
      hiveId: isShared ? hiveId : null,
      amount: normalizedAmount,
      category,
      description,
      type: isShared ? 'shared' : 'personal',
      source: 'bank_sync',
      date: shiftedDate,
      classifiedBy: 'user',
      externalTransactionId: externalId,
    })
  }
  return expenses
}

async function seed() {
  if (!isConfigured()) {
    console.error('Open Finance credentials not configured.')
    console.error('Please set OPEN_FINANCE_CLIENT_ID and OPEN_FINANCE_CLIENT_SECRET in your .env file.')
    console.error('')
    console.error('To use sandbox data:')
    console.error('1. Get your clientId and clientSecret from https://dashboard.open-finance.ai')
    console.error('2. The userId can be any unique identifier (we use "user_demo_1", "user_demo_2")')
    console.error('3. Create connections first at the Open Finance dashboard with includeFakeProviders: true')
    console.error('4. Use sandbox PSU IDs like 043510023 for open-finance-sandbox provider')
    console.error('')
    console.error('See: https://docs.open-finance.ai/docs/testing-with-fake-bank-data')
    process.exit(1)
  }

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
        bankAccount: {
          connected: true,
          bankName: 'Open Finance Sandbox',
          lastSyncedAt: new Date(),
          accountId: null,
        },
      },
    },
    { upsert: true }
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
        bankAccount: {
          connected: true,
          bankName: 'Open Finance Sandbox',
          lastSyncedAt: new Date(),
          accountId: null,
        },
      },
    },
    { upsert: true }
  )
  console.log('Created demo users')

  let allExpenses = []

  try {
    const txA = await fetchTransactionsForUser(DEMO_USER_A)
    const expensesA = transformTransactions(txA, DEMO_USER_A, hive._id)
    allExpenses = allExpenses.concat(expensesA)
    console.log(`Fetched ${expensesA.length} transactions for user A`)
  } catch (err) {
    console.warn(`Could not fetch transactions for user A: ${err.message}`)
    console.warn('This is expected if no connection exists yet for this user.')
  }

  try {
    const txB = await fetchTransactionsForUser(DEMO_USER_B)
    const expensesB = transformTransactions(txB, DEMO_USER_B, hive._id)
    allExpenses = allExpenses.concat(expensesB)
    console.log(`Fetched ${expensesB.length} transactions for user B`)
  } catch (err) {
    console.warn(`Could not fetch transactions for user B: ${err.message}`)
    console.warn('This is expected if no connection exists yet for this user.')
  }

  if (allExpenses.length > 0) {
    await Expense.insertMany(allExpenses)
    console.log(`Seeded ${allExpenses.length} real transactions from Open Finance API`)
  } else {
    console.warn('')
    console.warn('No transactions fetched. You need to create connections first!')
    console.warn('')
    console.warn('To create sandbox connections:')
    console.warn('1. Run: npm run seed:sandbox-connect')
    console.warn('2. Open the connectUrl in your browser')
    console.warn('3. Use sandbox PSU ID: 043510023 with provider: open-finance-sandbox')
    console.warn('4. Complete the connection flow')
    console.warn('5. Run this script again')
    console.warn('')
  }

  const now = new Date()
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
  console.log('\nSeed complete!')

  await mongoose.disconnect()
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed error:', err)
    process.exit(1)
  })
}

module.exports = { guessCategory, mapCategory }
