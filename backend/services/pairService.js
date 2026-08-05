const User = require('../models/User')
const Hive = require('../models/Hive')
const PairInvite = require('../models/PairInvite')
const {
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SHARED_CATEGORIES,
} = require('../models/User')
const { AppError } = require('../utils/appError')
const { syncNewConnection } = require('../jobs/transactionSync')

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
    const existing = await PairInvite.exists({ code, usedAt: null, expiresAt: { $gt: new Date() } })
    if (!existing) {
      return code
    }
  }

  throw new AppError(503, 'PAIR_CODE_UNAVAILABLE', 'Unable to generate pair code. Try again.')
}

async function findActiveHiveId(userId) {
  const hive = await Hive.findOne({ userIds: userId, isActive: true }).lean()
  return hive?._id?.toString() || null
}

async function generatePairCode(userId, fallbackUser, requestedHiveId = null) {
  const user = await ensureUserRecord(userId, fallbackUser)
  let hiveId = requestedHiveId || user.hiveId || null
  if (hiveId) {
    const hive = await Hive.findOne({ _id: hiveId, userIds: userId, isActive: true })
    if (!hive) {
      throw new AppError(404, 'HIVE_NOT_FOUND', 'Hive not found or not accessible.')
    }
  } else {
    const hive = await Hive.create({ userIds: [userId], isActive: true })
    hiveId = hive._id.toString()
    if (!user.hiveId) {
      user.hiveId = hiveId
    }
  }

  const code = await generateUniquePairCode()
  const expiresAt = new Date(Date.now() + PAIR_CODE_TTL_MS)

  await PairInvite.create({ code, inviterUserId: user._id, hiveId, expiresAt })

  user.pairCode = code
  user.pairCodeExpiresAt = expiresAt
  user.pairCodeUsedAt = null
  user.pairCodeHiveId = hiveId
  await user.save()

  return {
    code,
    expiresAt: expiresAt.toISOString(),
    paired: false,
    hiveId,
  }
}

async function joinPairCode(userId, code, fallbackUser) {
  const normalizedCode = String(code || '').trim().toUpperCase()
  const user = await ensureUserRecord(userId, fallbackUser)
  const now = new Date()
  const invite = await PairInvite.findOne({ code: normalizedCode, usedAt: null, expiresAt: { $gt: now } })
  const partner = invite
    ? await User.findById(invite.inviterUserId)
    : await User.findOne({ pairCode: normalizedCode, pairCodeUsedAt: null, pairCodeExpiresAt: { $gt: now } })

  if (!partner) {
    if (user.pairId) {
      throw new AppError(409, 'ALREADY_PAIRED', 'User is already paired.')
    }
    throw new AppError(404, 'PAIR_CODE_NOT_FOUND', 'Pair code is invalid or expired.')
  }
  if (partner._id.toString() === user._id.toString()) {
    throw new AppError(400, 'INVALID_PARTNER', 'Cannot join your own pair code.')
  }
  let hiveId = invite?.hiveId?.toString() || partner.pairCodeHiveId || partner.hiveId || null
  if (!hiveId) {
    const hive = await Hive.create({ userIds: [user._id, partner._id], isActive: true })
    hiveId = hive._id.toString()
  } else {
    const targetHive = await Hive.findOneAndUpdate(
      { _id: hiveId, userIds: partner._id, isActive: true },
      { $addToSet: { userIds: user._id } },
      { new: true },
    )
    if (!targetHive) {
      throw new AppError(404, 'HIVE_NOT_FOUND', 'The hive linked to this code no longer exists.')
    }
  }

  user.pairId = partner._id
  user.hiveId = hiveId
  partner.pairId = user._id
  partner.hiveId = hiveId
  partner.pairCodeUsedAt = now
  partner.pairCode = null
  partner.pairCodeExpiresAt = null
  partner.pairCodeHiveId = null

  if (invite) {
    invite.usedAt = now
    await invite.save()
  }

  await Promise.all([user.save(), partner.save()])

  // Bank accounts are usually connected during onboarding, before a hive
  // exists — trigger a catch-up sync now that we have a real hiveId to
  // attach shared expenses to, instead of waiting for the recurring job.
  await Promise.all(
    [user, partner]
      .filter((member) => member.bankAccount?.connected && member.bankAccount?.accountId)
      .map((member) =>
        syncNewConnection(member._id, member.bankAccount.accountId, hiveId).catch((syncError) => {
          console.warn(`Post-pairing transaction sync failed for ${member._id}:`, syncError.message)
        }),
      ),
  )

  return {
    success: true,
    paired: true,
    partnerId: partner._id,
    hiveId,
  }
}

async function getPairStatus(userId, fallbackUser) {
  const user = await ensureUserRecord(userId, fallbackUser)
  const now = new Date()
  const codeActive = Boolean(user.pairCode && user.pairCodeExpiresAt && user.pairCodeExpiresAt > now)
  const activeHives = await Hive.find({ userIds: userId, isActive: true }).select('_id userIds').lean()
  const pairedHive = activeHives.find((hive) => hive.userIds.length >= 2)
  const hiveId = user.hiveId || pairedHive?._id?.toString() || null
  const paired = activeHives.some((hive) => hive.userIds.length >= 2)

  return {
    paired,
    pairId: user.pairId || null,
    hiveId,
    code: codeActive ? user.pairCode : null,
    codeExpiresAt: codeActive ? user.pairCodeExpiresAt.toISOString() : null,
    onboardingComplete: paired,
    nextStep: paired ? 'app' : 'pair',
  }
}

module.exports = {
  generatePairCode,
  joinPairCode,
  getPairStatus,
}
