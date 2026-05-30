const mongoose = require('mongoose')
const Hive = require('../models/Hive')
const Expense = require('../models/Expense')
const User = require('../models/User')
const { fetchAccountTransactions, isConfigured } = require('../services/openFinanceService')
const { classifyExpense } = require('../src/services/ai.service')

const SYNC_INTERVAL_MS = Number(process.env.TRANSACTION_SYNC_INTERVAL_MS || 5 * 60 * 1000)
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

let syncHandle = null
let syncInFlight = false

function yesterdayISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
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

async function fetchWithRetry(accountId, options, attempt = 1) {
  try {
    return await fetchAccountTransactions(accountId, options)
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err
    const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
    await new Promise((resolve) => setTimeout(resolve, delay))
    return fetchWithRetry(accountId, options, attempt + 1)
  }
}

async function classifyAndDetermineType(transaction, userSharedCategories) {
  const category = mapCategory(transaction.category)
  try {
    const result = classifyExpense({
      description: transaction.description || transaction.remittanceInformation || '',
      amount: Math.abs(transaction.amount || 0),
      category,
      sharedCategories: userSharedCategories,
    })
    return { category, type: result.label, classifiedBy: 'ai' }
  } catch {
    return { category, type: 'personal', classifiedBy: 'user' }
  }
}

async function syncTransactionsForUser(userId, accountId, hiveId) {
  const from = yesterdayISO()
  const to = todayISO()

  const rawTransactions = await fetchWithRetry(accountId, { from, to })
  if (!rawTransactions.length) return 0

  const user = await User.findById(userId).lean()
  const userSharedCategories = user?.sharedCategories || []

  let created = 0
  for (const tx of rawTransactions) {
    const externalId = tx.transactionId || tx.id || null
    if (externalId) {
      const exists = await Expense.findOne({
        userId,
        source: 'bank_sync',
        externalTransactionId: externalId,
      }).lean()
      if (exists) continue
    }

    const { category, type, classifiedBy } = await classifyAndDetermineType(tx, userSharedCategories)
    const amount = Math.abs(tx.amount || 0)
    if (amount <= 0) continue

    await Expense.create({
      hiveId: type === 'shared' ? hiveId : null,
      userId,
      amount,
      category,
      description: tx.description || tx.remittanceInformation || 'Bank transaction',
      type,
      source: 'bank_sync',
      date: tx.bookingDate || tx.valueDate || new Date(),
      classifiedBy,
      externalTransactionId: externalId,
    })
    created++
  }

  return created
}

async function syncAllHives() {
  if (syncInFlight || mongoose.connection.readyState !== 1 || !isConfigured()) {
    return
  }

  syncInFlight = true
  try {
    const activeHives = await Hive.find({ isActive: true }).lean()
    for (const hive of activeHives) {
      for (const userId of hive.userIds) {
        const user = await User.findById(userId).lean()
        const accountId = user?.bankAccount?.accountId
        if (!accountId) continue

        try {
          const count = await syncTransactionsForUser(userId, accountId, hive._id)
          if (count > 0) {
            console.log(`[transactionSync] Synced ${count} transactions for user ${userId}`)
          }
        } catch (err) {
          console.warn(`[transactionSync] Failed for user ${userId}:`, err.message)
        }
      }
    }
  } finally {
    syncInFlight = false
  }
}

function startTransactionSyncLoop() {
  if (syncHandle || !isConfigured()) {
    return
  }

  console.log(`[transactionSync] Starting sync loop (interval: ${SYNC_INTERVAL_MS}ms)`)
  syncHandle = setInterval(() => {
    syncAllHives()
  }, SYNC_INTERVAL_MS)

  syncHandle.unref?.()

  // Run once immediately on start
  syncAllHives()
}

function stopTransactionSyncLoop() {
  if (syncHandle) {
    clearInterval(syncHandle)
    syncHandle = null
  }
}

module.exports = {
  startTransactionSyncLoop,
  stopTransactionSyncLoop,
  syncAllHives,
  syncTransactionsForUser,
  classifyAndDetermineType,
  mapCategory,
}
