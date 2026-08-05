const mongoose = require('mongoose')
const Hive = require('../models/Hive')
const Expense = require('../models/Expense')
const User = require('../models/User')
const { fetchAccountTransactions, isConfigured } = require('../services/openFinanceService')
const { classifyExpense, fromBankTransaction } = require('../src/ai/classification')
const { classifyExpenseRuleBased } = require('../src/ai/classifier')

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

function daysAgoISO(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function daysFromNowISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Sandbox/real bank history can span well beyond the last couple of days —
// Open Finance's own sandbox data is dated across several months and even
// slightly into the future. Use a wide window the first time we sync a
// newly connected account so existing history isn't missed; the recurring
// loop then only needs a narrow window for incremental updates.
const INITIAL_SYNC_LOOKBACK_DAYS = 365
const INITIAL_SYNC_LOOKAHEAD_DAYS = 30

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

async function fetchTransactionsForUser(user, accountId, options) {
  if (!user?.email) {
    throw new Error('User email is required for Open Finance transaction sync')
  }
  return fetchWithRetry(accountId, { ...options, openFinanceUserId: user.email })
}

function buildAiSuggestionSnapshot(suggestion) {
  return {
    category: { value: suggestion.category.value, confidence: suggestion.category.confidence },
    type: {
      value: suggestion.personalOrShared.value,
      confidence: suggestion.personalOrShared.confidence,
      reasoning: suggestion.personalOrShared.reasoning,
    },
    hive: suggestion.hive
      ? {
          expenseGroupId: suggestion.hive.expenseGroupId || null,
          groupName: suggestion.hive.groupName || null,
          confidence: suggestion.hive.confidence,
        }
      : null,
  }
}

/**
 * Classify a raw bank transaction with the full multi-task classifier. The expense is
 * always created (a transaction is never dropped), but an AI-derived result is stored
 * as a pending suggestion (`needsReview: true`) rather than a finalized user decision —
 * see the "suggest, never auto-apply" principle for bank sync.
 * @param {object} transaction Raw transaction from the Open Finance API.
 * @param {{ userId: string, hiveId: string, userSharedCategories?: string[] }} context
 */
async function classifyTransaction(transaction, { userId, hiveId, userSharedCategories }) {
  const categoryHint = mapCategory(transaction.category)

  try {
    const signal = fromBankTransaction(transaction, { category: categoryHint })
    const suggestion = await classifyExpense(signal, { userId, hiveId })

    return {
      category: suggestion.category.value,
      type: suggestion.personalOrShared.value,
      expenseGroupId: suggestion.hive?.expenseGroupId || null,
      classifiedBy: 'ai',
      needsReview: true,
      aiSuggestion: buildAiSuggestionSnapshot(suggestion),
    }
  } catch {
    const fallback = classifyExpenseRuleBased({
      description: transaction.description || transaction.remittanceInformation || '',
      amount: Math.abs(transaction.amount || 0),
      category: categoryHint,
      sharedCategories: userSharedCategories,
    })

    return {
      category: categoryHint,
      type: fallback.label,
      expenseGroupId: null,
      classifiedBy: 'user',
      needsReview: false,
      aiSuggestion: null,
    }
  }
}

async function syncTransactionsForUser(userId, accountId, hiveId, { from, to } = {}) {
  const rangeFrom = from || yesterdayISO()
  const rangeTo = to || todayISO()

  const user = await User.findById(userId).lean()
  const rawTransactions = await fetchTransactionsForUser(user, accountId, { from: rangeFrom, to: rangeTo })
  if (!rawTransactions.length) return 0

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

    const amount = Math.abs(tx.amount || 0)
    if (amount <= 0) continue

    const classification = await classifyTransaction(tx, { userId, hiveId, userSharedCategories })

    await Expense.create({
      hiveId: classification.type === 'shared' ? hiveId : null,
      expenseGroupId: classification.type === 'shared' ? classification.expenseGroupId : null,
      userId,
      amount,
      category: classification.category,
      description: tx.description || tx.remittanceInformation || 'Bank transaction',
      type: classification.type,
      source: 'bank_sync',
      date: tx.bookingDate || tx.valueDate || new Date(),
      classifiedBy: classification.classifiedBy,
      needsReview: classification.needsReview,
      aiSuggestion: classification.aiSuggestion,
      externalTransactionId: externalId,
    })
    created++
  }

  return created
}

/**
 * Pull the full lookback window for an account right after it's connected
 * (or after it joins a hive), instead of waiting for the narrow recurring
 * window to slowly catch up.
 */
async function syncNewConnection(userId, accountId, hiveId) {
  return syncTransactionsForUser(userId, accountId, hiveId, {
    from: daysAgoISO(INITIAL_SYNC_LOOKBACK_DAYS),
    to: daysFromNowISO(INITIAL_SYNC_LOOKAHEAD_DAYS),
  })
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
  syncNewConnection,
  classifyTransaction,
  mapCategory,
}
