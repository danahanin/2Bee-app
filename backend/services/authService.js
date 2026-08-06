const crypto = require('crypto')
const bcrypt = require('bcrypt')
const User = require('../models/User')
const Session = require('../models/Session')
const RefreshToken = require('../models/RefreshToken')
const { AppError } = require('../utils/appError')

const ACCESS_TOKEN_TTL_MINUTES = Number(process.env.ACCESS_TOKEN_TTL_MINUTES || 15)
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7)
const ROTATE_ON_REFRESH = process.env.ROTATE_REFRESH_TOKENS !== 'false'
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10)

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return ''
  }
  return email.trim().toLowerCase()
}

function toSafeUser(user) {
  if (!user) return null
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    pairId: user.pairId ?? null,
    hiveId: user.hiveId ?? null,
    createdAt: user.createdAt,
  }
}

function toSafeToken(doc) {
  return { token: doc.token, expiresAt: doc.expiresAt.toISOString() }
}

async function createSession(userId) {
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MINUTES * 60 * 1000)
  const session = await Session.create({
    token: crypto.randomBytes(32).toString('hex'),
    userId,
    expiresAt,
  })
  return toSafeToken(session)
}

async function createRefreshToken(userId) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  const refreshToken = await RefreshToken.create({
    token: crypto.randomBytes(48).toString('hex'),
    userId,
    expiresAt,
  })
  return toSafeToken(refreshToken)
}

function generateUserId() {
  if (typeof crypto.randomUUID === 'function') {
    return `user_${crypto.randomUUID()}`
  }
  return `user_${crypto.randomBytes(12).toString('hex')}`
}

async function ensureDemoUser() {
  const existing = await User.findOne({ emailLower: 'demo@2bee.app' }).lean()
  if (existing) {
    return
  }

  const passwordHash = await bcrypt.hash('123456', BCRYPT_SALT_ROUNDS)
  await User.create({
    _id: 'user_demo_1',
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@2bee.app',
    emailLower: 'demo@2bee.app',
    passwordHash,
  })
}

async function registerUser({ firstName, lastName, email, password }) {
  const normalizedEmail = normalizeEmail(email || '')
  if (!normalizedEmail) {
    throw new AppError(400, 'INVALID_EMAIL', 'A valid email address is required.')
  }

  const existing = await User.findOne({ emailLower: normalizedEmail }).lean()
  if (existing) {
    throw new AppError(409, 'EMAIL_IN_USE', 'That email is already registered.')
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
  const user = await User.create({
    _id: generateUserId(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    emailLower: normalizedEmail,
    passwordHash,
  })

  return toSafeUser(user)
}

async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email || '')
  const user = await User.findOne({ emailLower: normalizedEmail })
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash)
  if (!passwordOk) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
  }

  const [session, refreshToken] = await Promise.all([createSession(user._id), createRefreshToken(user._id)])
  return {
    session,
    refreshToken,
    user: toSafeUser(user),
  }
}

async function logoutUser({ accessToken, refreshToken }) {
  if (!accessToken && !refreshToken) {
    throw new AppError(400, 'TOKEN_REQUIRED', 'A valid session or refresh token is required.')
  }

  if (accessToken) {
    const removed = await Session.findOneAndDelete({ token: accessToken })
    if (!removed) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Session already closed or missing.')
    }
  }

  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken })
  }
}

async function getUserFromToken(token) {
  if (!token) {
    return null
  }

  const session = await Session.findOne({ token }).lean()
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await Session.deleteOne({ token })
    }
    return null
  }

  const user = await User.findById(session.userId)
  if (!user) {
    await Session.deleteOne({ token })
    return null
  }

  return {
    session: { token: session.token, expiresAt: session.expiresAt.toISOString() },
    user: toSafeUser(user),
  }
}

async function refreshSession({ refreshToken: tokenValue }) {
  if (!tokenValue) {
    throw new AppError(400, 'TOKEN_REQUIRED', 'Refresh token is required.')
  }

  const existing = await RefreshToken.findOne({ token: tokenValue }).lean()
  if (!existing || existing.expiresAt.getTime() <= Date.now()) {
    if (existing) {
      await RefreshToken.deleteOne({ token: tokenValue })
    }
    throw new AppError(401, 'INVALID_REFRESH', 'Refresh token expired or invalid.')
  }

  const user = await User.findById(existing.userId)
  if (!user) {
    await RefreshToken.deleteOne({ token: tokenValue })
    throw new AppError(401, 'INVALID_REFRESH', 'Refresh token expired or invalid.')
  }

  const [newSession, newRefreshToken] = await Promise.all([createSession(user._id), createRefreshToken(user._id)])

  if (ROTATE_ON_REFRESH) {
    await RefreshToken.deleteOne({ token: tokenValue })
  }

  return {
    session: newSession,
    refreshToken: newRefreshToken,
    user: toSafeUser(user),
  }
}

module.exports = {
  ensureDemoUser,
  getUserFromToken,
  loginUser,
  refreshSession,
  logoutUser,
  registerUser,
}
