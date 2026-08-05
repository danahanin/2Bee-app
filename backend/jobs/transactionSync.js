const mongoose = require('mongoose')
const Hive = require('../models/Hive')
const Expense = require('../models/Expense')
const User = require('../models/User')
const {
  fetchAccountTransactions,
  isConfigured,
  resolvePrimaryAccount,
} = require('../services/openFinanceService')
const { classifyExpense, fromBankTransaction } = require('../src/ai/classification')
const { classifyExpenseRuleBased } = require('../src/ai/classifier')

const SYNC_INTERVAL_MS = Number(process.env.TRANSACTION_SYNC_INTERVAL_MS || 5 * 60 * 1000)
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

const INITIAL_SYNC_RULE_BASED = String(process.env.BANK_SYNC_INITIAL_RULE_BASED ?? 'true').toLowerCase() !== 'false'

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

function classifyTransactionRuleBased(transaction, { userSharedCategories } = {}) {
  const categoryHint = mapCategory(transaction.category)
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

/**
 * Classify a raw bank transaction. When useLlm is true, AI results are stored as a
 * pending suggestion (`needsReview: true`) rather than a finalized decision.
 * Initial bulk imports can skip the LLM via useLlm: false.
 * @param {object} transaction Raw transaction from the Open Finance API.
 * @param {{ userId: string, hiveId: string, userSharedCategories?: string[], useLlm?: boolean }} context
 */
async function classifyTransaction(transaction, { userId, hiveId, userSharedCategories, useLlm = true }) {
  if (!useLlm) {
    return classifyTransactionRuleBased(transaction, { userSharedCategories })
  }

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
    return classifyTransactionRuleBased(transaction, { userSharedCategories })
  }
}

async function syncTransactionsForUser(userId, accountId, hiveId, { from, to, useLlm = true } = {}) {
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

    const classification = await classifyTransaction(tx, {
      userId,
      hiveId,
      userSharedCategories,
      useLlm,
    })

    await Expense.create({
      hiveId: classification.type === 'shared' ? hiveId : null,
      expenseGroupId: classification.type === 'shared' ? classification.expenseGroupId : null,
      userId,
      amount,
      currency: tx.currency || 'ILS',
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
 * window to slowly catch up. Uses rule-based classification by default so
 * the dashboard fills immediately; incremental syncs still go through the LLM.
 */
async function syncNewConnection(userId, accountId, hiveId) {
  return syncTransactionsForUser(userId, accountId, hiveId, {
    from: daysAgoISO(INITIAL_SYNC_LOOKBACK_DAYS),
    to: daysFromNowISO(INITIAL_SYNC_LOOKAHEAD_DAYS),
    useLlm: !INITIAL_SYNC_RULE_BASED,
  })
}

async function ensureAccountId(user) {
  let accountId = user?.bankAccount?.accountId || null
  if (accountId || !user?.bankAccount?.connected || !user?.email) {
    return accountId
  }

  try {
    const primaryAccount = await resolvePrimaryAccount(user.email)
    if (!primaryAccount?.accountId) return null

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'bankAccount.accountId': primaryAccount.accountId,
          'bankAccount.bankName': primaryAccount.bankName || user.bankAccount?.bankName || 'Open Finance',
        },
      },
    )
    console.log(`[transactionSync] Recovered accountId for ${user.email}`)
    return primaryAccount.accountId
  } catch (err) {
    console.warn(`[transactionSync] Could not recover accountId for ${user._id}:`, err.message)
    return null
  }
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
        const accountId = await ensureAccountId(user)
        if (!accountId) continue

        try {
          // Until the wide history import finishes, keep using syncNewConnection
          // (rule-based by default). Incremental ticks after that use the LLM.
          const initialImport = !user?.bankAccount?.initialSyncComplete
          const count = initialImport
            ? await syncNewConnection(userId, accountId, hive._id)
            : await syncTransactionsForUser(userId, accountId, hive._id, { useLlm: true })

          const updates = { 'bankAccount.lastSyncedAt': new Date() }
          if (initialImport) {
            updates['bankAccount.initialSyncComplete'] = true
          }

          if (count > 0 || initialImport) {
            await User.updateOne({ _id: userId }, { $set: updates })
          }
          if (count > 0) {
            console.log(
              `[transactionSync] Synced ${count} transactions for user ${userId}` +
                (initialImport ? ' (initial/rule-based)' : ''),
            )
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
