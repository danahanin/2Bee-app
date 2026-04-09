const crypto = require('crypto')
const bcrypt = require('bcrypt')
const {
  addSession,
  addUser,
  findSessionByToken,
  findUserByEmail,
  findUserById,
  normalizeEmail,
  revokeSession,
} = require('./authStore')
const { AppError } = require('../utils/appError')

const ACCESS_TOKEN_TTL_MINUTES = Number(process.env.ACCESS_TOKEN_TTL_MINUTES || 15)
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10)

function toSafeUser(user) {
  if (!user) return null
  const { passwordHash, emailLower, ...safe } = user
  return {
    ...safe,
    pairId: user.pairId ?? null,
    hiveId: user.hiveId ?? null,
  }
}

function createSession(userId) {
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + ACCESS_TOKEN_TTL_MINUTES * 60 * 1000)
  const session = {
    token: crypto.randomBytes(32).toString('hex'),
    userId,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  return addSession(session)
}

function ensureDemoUser() {
  const existing = findUserByEmail('demo@2bee.app')
  if (existing) {
    return
  }

  const passwordHash = bcrypt.hashSync('123456', BCRYPT_SALT_ROUNDS)
  addUser({
    id: 'user_demo_1',
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@2bee.app',
    emailLower: 'demo@2bee.app',
    passwordHash,
    pairId: null,
    hiveId: null,
    createdAt: new Date().toISOString(),
  })
}

function generateUserId() {
  if (typeof crypto.randomUUID === 'function') {
    return `user_${crypto.randomUUID()}`
  }
  return `user_${crypto.randomBytes(12).toString('hex')}`
}

ensureDemoUser()

async function registerUser({ firstName, lastName, email, password }) {
  const normalizedEmail = normalizeEmail(email || '')
  if (!normalizedEmail) {
    throw new AppError(400, 'INVALID_EMAIL', 'A valid email address is required.')
  }

  const existing = findUserByEmail(normalizedEmail)
  if (existing) {
    throw new AppError(409, 'EMAIL_IN_USE', 'That email is already registered.')
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
  const user = addUser({
    id: generateUserId(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    emailLower: normalizedEmail,
    passwordHash,
    pairId: null,
    hiveId: null,
    createdAt: new Date().toISOString(),
  })

  return toSafeUser(user)
}

async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email || '')
  const user = findUserByEmail(normalizedEmail)
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash)
  if (!passwordOk) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
  }

  const session = createSession(user.id)
  return {
    session,
    user: toSafeUser(user),
  }
}

function logoutUser(token) {
  if (!token) {
    throw new AppError(400, 'TOKEN_REQUIRED', 'A valid session token is required.')
  }

  const removed = revokeSession(token)
  if (!removed) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Session already closed or missing.')
  }
}

function getUserFromToken(token) {
  if (!token) {
    return null
  }

  const session = findSessionByToken(token)
  if (!session) {
    return null
  }

  const user = findUserById(session.userId)
  if (!user) {
    revokeSession(token)
    return null
  }

  return {
    session,
    user: toSafeUser(user),
  }
}

module.exports = {
  getUserFromToken,
  loginUser,
  logoutUser,
  registerUser,
}
