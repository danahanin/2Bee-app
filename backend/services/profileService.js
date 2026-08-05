const mongoose = require('mongoose')
const User = require('../models/User')
const Hive = require('../models/Hive')
const {
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SHARED_CATEGORIES,
} = require('../models/User')
const { AppError } = require('../utils/appError')
const openFinance = require('./openFinanceService')
const { syncNewConnection } = require('../jobs/transactionSync')

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase()
}

async function ensureUserRecord(userId, fallback = {}) {
  let user = await User.findById(userId)
  if (user) return user

  if (!fallback.email || !fallback.firstName || !fallback.lastName) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.')
  }

  user = await User.create({
    _id: userId,
    email: fallback.email,
    emailLower: normalizeEmail(fallback.email),
    passwordHash: fallback.passwordHash || 'external-auth',
    firstName: fallback.firstName,
    lastName: fallback.lastName,
    pairId: fallback.pairId || null,
    hiveId: fallback.hiveId || null,
    avatarUrl: fallback.avatarUrl ?? null,
    bio: fallback.bio ?? '',
    bankAccount: {
      connected: false,
      bankName: '',
      lastSyncedAt: null,
    },
    privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
    sharedCategories: [...DEFAULT_SHARED_CATEGORIES],
  })

  return user
}

function toProfile(user) {
  const bankAccount = user.bankAccount
    ? {
        connected: Boolean(user.bankAccount.connected),
        bankName: user.bankAccount.bankName || '',
        lastSyncedAt: user.bankAccount.lastSyncedAt || null,
      }
    : null

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    avatarType: user.avatarType || null,
    bio: user.bio,
    pairId: user.pairId,
    hiveId: user.hiveId,
    sharedCategories: user.sharedCategories,
    bankAccount,
    displayCurrency: user.displayCurrency || 'ILS',
  }
}

async function getProfile(userId, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  return toProfile(user)
}

async function updateProfile(userId, data, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)

  if (data.firstName !== undefined) user.firstName = data.firstName
  if (data.lastName !== undefined) user.lastName = data.lastName
  if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl
  if (data.avatarType !== undefined) user.avatarType = data.avatarType
  if (data.bio !== undefined) user.bio = data.bio

  await user.save()
  return toProfile(user)
}

async function setAvatar(userId, { avatarUrl, avatarType }, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  user.avatarUrl = avatarUrl
  if (avatarType) user.avatarType = avatarType
  await user.save()
  return toProfile(user)
}

async function getPrivacySettings(userId, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  return { ...DEFAULT_PRIVACY_SETTINGS, ...user.privacySettings }
}

async function updatePrivacySettings(userId, settings, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  user.privacySettings = { ...DEFAULT_PRIVACY_SETTINGS, ...user.privacySettings, ...settings }
  await user.save()
  return { ...user.privacySettings }
}

async function getNotificationSettings(userId, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...user.notificationSettings }
}

async function updateNotificationSettings(userId, settings, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  user.notificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...user.notificationSettings,
    ...settings,
  }
  await user.save()
  return { ...user.notificationSettings }
}

async function updateSharedCategories(userId, categories, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  user.sharedCategories = categories
  await user.save()
  return [...user.sharedCategories]
}

async function getDisplayCurrency(userId, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  return { displayCurrency: user.displayCurrency || 'ILS' }
}

async function updateDisplayCurrency(userId, displayCurrency, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  user.displayCurrency = displayCurrency
  await user.save()
  return { displayCurrency: user.displayCurrency }
}

async function disconnectPair(userId, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  if (!user.pairId) {
    throw new AppError(409, 'NOT_PAIRED', 'User is not currently paired.')
  }

  const partner = await User.findById(user.pairId)
  if (!partner) {
    throw new AppError(404, 'PARTNER_NOT_FOUND', 'Partner user does not exist.')
  }

  const hiveId = user.hiveId || partner.hiveId
  const clearPairState = async (session = null) => {
    const saveOptions = session ? { session } : undefined
    user.pairId = null
    user.hiveId = null
    await user.save(saveOptions)

    partner.pairId = null
    partner.hiveId = null
    await partner.save(saveOptions)

    if (hiveId) {
      const updateOptions = session ? { session } : undefined
      await Hive.findByIdAndUpdate(hiveId, { isActive: false }, updateOptions)
    }
  }

  const session = await mongoose.startSession()
  try {
    try {
      await session.withTransaction(async () => {
        await clearPairState(session)
      })
    } catch (error) {
      const txUnsupported = /Transaction numbers are only allowed/i.test(error.message)
      if (!txUnsupported) {
        throw error
      }
      await clearPairState()
    }
  } finally {
    await session.endSession()
  }

  return {
    success: true,
    message: 'Pair disconnected',
    users: [user._id, partner._id],
  }
}

async function reconnectPair(userId, { partnerId, partnerCode }, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  if (user.pairId) {
    throw new AppError(409, 'ALREADY_PAIRED', 'Disconnect current pair before reconnecting.')
  }

  let partner = null
  if (partnerId) {
    partner = await User.findById(partnerId)
  } else if (partnerCode) {
    partner = await User.findOne({ pairCode: partnerCode })
  }

  if (!partner) {
    throw new AppError(404, 'PARTNER_NOT_FOUND', 'Partner was not found.')
  }
  if (partner._id === user._id) {
    throw new AppError(400, 'INVALID_PARTNER', 'Cannot pair with yourself.')
  }
  if (partner.pairId) {
    throw new AppError(409, 'PARTNER_ALREADY_PAIRED', 'Partner is already paired with another user.')
  }

  const [hive] = await Hive.create([{ userIds: [user._id, partner._id], isActive: true }])
  user.pairId = partner._id
  user.hiveId = hive._id.toString()
  partner.pairId = user._id
  partner.hiveId = hive._id.toString()
  await Promise.all([user.save(), partner.save()])

  return {
    success: true,
    message: 'Reconnected',
    hiveId: hive._id.toString(),
  }
}

async function connectBank(userId, fallbackUser, { redirectUrl } = {}) {
  const user = await ensureUserRecord(userId, fallbackUser)
  const openFinanceUserId = user.email || fallbackUser?.email || ''

  if (!openFinance.isConfigured()) {
    throw new AppError(
      503,
      'OPEN_FINANCE_NOT_CONFIGURED',
      'Open Finance is not configured. Set OPEN_FINANCE_CLIENT_ID and OPEN_FINANCE_CLIENT_SECRET to connect a bank account.',
    )
  }

  if (!openFinanceUserId) {
    throw new AppError(400, 'USER_EMAIL_REQUIRED', 'Your account email is required to connect a bank account.')
  }

  const connection = await openFinance.createBankConnection({
    redirectUrl,
    openFinanceUserId,
  })
  if (!connection.connectUrl) {
    throw new AppError(
      502,
      'OPEN_FINANCE_CONNECT_URL_MISSING',
      'Open Finance did not return a connect URL. Check provider credentials and try again.',
    )
  }

  return {
    configured: true,
    connected: false,
    connectUrl: connection.connectUrl,
    connectionId: connection.connectionId || null,
  }
}

const ACCOUNT_FETCH_ATTEMPTS = 6
const ACCOUNT_FETCH_DELAY_MS = 1500

async function confirmBankConnection(userId, fallbackUser, { connectionId, status } = {}) {
  const user = await ensureUserRecord(userId, fallbackUser)
  const normalizedStatus = String(status || '').toLowerCase()
  const connected = !['error', 'cancelled', 'canceled', 'failed'].includes(normalizedStatus)

  // `connectionId` identifies the consent, not a fetchable account — the real
  // account id (needed to pull transactions) has to be looked up separately
  // once the connection is active.
  let accountId = user.bankAccount?.accountId || null
  let bankName = user.bankAccount?.bankName || ''

  if (connected && user.email && !accountId) {
    try {
      const primaryAccount = await openFinance.resolvePrimaryAccount(user.email, {
        attempts: ACCOUNT_FETCH_ATTEMPTS,
        delayMs: ACCOUNT_FETCH_DELAY_MS,
      })
      if (primaryAccount?.accountId) {
        accountId = primaryAccount.accountId
        bankName = primaryAccount.bankName || bankName
      }
    } catch (fetchError) {
      console.warn('Failed to fetch Open Finance accounts:', fetchError.message)
    }
  }

  user.bankAccount = {
    ...(user.bankAccount?.toObject?.() || user.bankAccount || {}),
    connected,
    bankName: connected ? bankName || 'Open Finance' : user.bankAccount?.bankName || '',
    lastSyncedAt: connected ? new Date() : user.bankAccount?.lastSyncedAt || null,
    accountId: connected ? accountId : user.bankAccount?.accountId || null,
  }
  await user.save()

  let syncedTransactions = 0
  if (connected && accountId) {
    try {
      syncedTransactions = await syncNewConnection(userId, accountId, user.hiveId || null)
      user.bankAccount.lastSyncedAt = new Date()
      user.bankAccount.initialSyncComplete = true
      await user.save()
    } catch (syncError) {
      console.warn('Initial transaction sync failed:', syncError.message)
    }
  } else if (connected && !accountId) {
    console.warn(
      `Bank connected for ${user.email || userId} but no accountId yet — sync will retry later.`,
    )
  }

  return {
    connected,
    syncedTransactions,
    bankAccount: {
      connected: user.bankAccount.connected,
      bankName: user.bankAccount.bankName,
      lastSyncedAt: user.bankAccount.lastSyncedAt,
    },
  }
}

async function disconnectBank(userId, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)

  user.bankAccount = {
    connected: false,
    bankName: '',
    lastSyncedAt: null,
    accountId: null,
    initialSyncComplete: false,
  }
  await user.save()

  return {
    success: true,
    bankAccount: {
      connected: false,
      bankName: '',
      lastSyncedAt: null,
    },
  }
}

module.exports = {
  getProfile,
  updateProfile,
  connectBank,
  confirmBankConnection,
  disconnectBank,
  setAvatar,
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  updateSharedCategories,
  getDisplayCurrency,
  updateDisplayCurrency,
  disconnectPair,
  reconnectPair,
}
