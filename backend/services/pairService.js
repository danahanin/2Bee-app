const User = require('../models/User')
const Hive = require('../models/Hive')
const {
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SHARED_CATEGORIES,
} = require('../models/User')
const { AppError } = require('../utils/appError')

const PAIR_CODE_TTL_MS = 10 * 60 * 1000
const PAIR_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PAIR_CODE_LENGTH = 6

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
    privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
    sharedCategories: [...DEFAULT_SHARED_CATEGORIES],
  })

  return user
}

function randomPairCode() {
  let code = ''
  for (let index = 0; index < PAIR_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * PAIR_CODE_ALPHABET.length)
    code += PAIR_CODE_ALPHABET[randomIndex]
  }
  return code
}

async function generateUniquePairCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomPairCode()
    const existing = await User.exists({
      pairCode: code,
      pairCodeUsedAt: null,
      pairCodeExpiresAt: { $gt: new Date() },
    })
    if (!existing) {
      return code
    }
  }

  throw new AppError(503, 'PAIR_CODE_UNAVAILABLE', 'Unable to generate pair code. Try again.')
}

async function generatePairCode(userId, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  if (user.pairId) {
    throw new AppError(409, 'ALREADY_PAIRED', 'User is already paired.')
  }

  const code = await generateUniquePairCode()
  const expiresAt = new Date(Date.now() + PAIR_CODE_TTL_MS)

  user.pairCode = code
  user.pairCodeExpiresAt = expiresAt
  user.pairCodeUsedAt = null
  await user.save()

  return {
    code,
    expiresAt: expiresAt.toISOString(),
  }
}

async function joinPairCode(userId, code, fallbackUser) {
  const normalizedCode = String(code || '').trim().toUpperCase()
  const user = await ensureUserRecord(userId, fallbackUser)
  if (user.pairId) {
    throw new AppError(409, 'ALREADY_PAIRED', 'User is already paired.')
  }

  const now = new Date()
  const partner = await User.findOne({
    pairCode: normalizedCode,
    pairCodeUsedAt: null,
    pairCodeExpiresAt: { $gt: now },
  })

  if (!partner) {
    throw new AppError(404, 'PAIR_CODE_NOT_FOUND', 'Pair code is invalid or expired.')
  }
  if (partner._id === user._id) {
    throw new AppError(400, 'INVALID_PARTNER', 'Cannot join your own pair code.')
  }
  if (partner.pairId) {
    throw new AppError(409, 'PARTNER_ALREADY_PAIRED', 'Code owner is already paired.')
  }

  let hiveId = partner.hiveId || null
  if (!hiveId) {
    const hive = await Hive.create({ userIds: [user._id, partner._id], isActive: true })
    hiveId = hive._id.toString()
  } else {
    await Hive.findByIdAndUpdate(hiveId, { userIds: [user._id, partner._id], isActive: true })
  }

  user.pairId = partner._id
  user.hiveId = hiveId
  partner.pairId = user._id
  partner.hiveId = hiveId
  partner.pairCodeUsedAt = now
  partner.pairCode = null
  partner.pairCodeExpiresAt = null

  await Promise.all([user.save(), partner.save()])

  return {
    success: true,
    partnerId: partner._id,
    hiveId,
  }
}

async function getPairStatus(userId, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  const now = new Date()
  const codeActive = Boolean(user.pairCode && user.pairCodeExpiresAt && user.pairCodeExpiresAt > now)

  return {
    paired: Boolean(user.pairId && user.hiveId),
    pairId: user.pairId || null,
    hiveId: user.hiveId || null,
    code: codeActive ? user.pairCode : null,
    codeExpiresAt: codeActive ? user.pairCodeExpiresAt.toISOString() : null,
  }
}

module.exports = {
  generatePairCode,
  joinPairCode,
  getPairStatus,
}
