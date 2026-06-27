const mongoose = require('mongoose')
const User = require('../models/User')
const Hive = require('../models/Hive')
const {
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SHARED_CATEGORIES,
} = require('../models/User')
const { AppError } = require('../utils/appError')

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

module.exports = {
  getProfile,
  updateProfile,
  setAvatar,
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  updateSharedCategories,
  disconnectPair,
  reconnectPair,
}
