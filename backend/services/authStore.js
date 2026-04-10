const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const STORE_FILE = path.join(DATA_DIR, 'auth-store.json')

const defaultState = {
  users: [],
  sessions: [],
  refreshTokens: [],
}

let state = null

function ensureStoreFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultState, null, 2))
  }
}

function loadState() {
  if (state) {
    return state
  }

  ensureStoreFile()
  const raw = fs.readFileSync(STORE_FILE, 'utf-8')
  if (!raw) {
    state = clone(defaultState)
    return state
  }

  try {
    const parsed = JSON.parse(raw)
    state = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      refreshTokens: Array.isArray(parsed.refreshTokens) ? parsed.refreshTokens : [],
    }
  } catch {
    state = clone(defaultState)
  }

  return state
}

function persistState() {
  if (!state) {
    return
  }

  fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2))
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return ''
  }
  return email.trim().toLowerCase()
}

function clone(value) {
  if (value === null || value === undefined) {
    return value
  }
  return JSON.parse(JSON.stringify(value))
}

function isSessionExpired(session) {
  if (!session) return true
  if (session.revokedAt) return true
  if (!session.expiresAt) return false
  return new Date(session.expiresAt).getTime() <= Date.now()
}

function isRefreshTokenExpired(token) {
  if (!token) return true
  if (token.revokedAt) return true
  if (!token.expiresAt) return false
  return new Date(token.expiresAt).getTime() <= Date.now()
}

function pruneExpiredSessions() {
  const currentState = loadState()
  const nextSessions = currentState.sessions.filter((session) => !isSessionExpired(session))
  if (nextSessions.length !== currentState.sessions.length) {
    currentState.sessions = nextSessions
    persistState()
  }
}

function pruneExpiredRefreshTokens() {
  const currentState = loadState()
  const nextTokens = currentState.refreshTokens.filter((token) => !isRefreshTokenExpired(token))
  if (nextTokens.length !== currentState.refreshTokens.length) {
    currentState.refreshTokens = nextTokens
    persistState()
  }
}

function findUserByEmail(email) {
  const currentState = loadState()
  return currentState.users.find((user) => user.emailLower === normalizeEmail(email)) || null
}

function findUserById(userId) {
  const currentState = loadState()
  return currentState.users.find((user) => user.id === userId) || null
}

function addUser(user) {
  const currentState = loadState()
  currentState.users.push(user)
  persistState()
  return clone(user)
}

function getUsers() {
  const currentState = loadState()
  return clone(currentState.users)
}

function addSession(session) {
  pruneExpiredSessions()
  const currentState = loadState()
  currentState.sessions.push(session)
  persistState()
  return clone(session)
}

function findSessionByToken(token) {
  pruneExpiredSessions()
  const currentState = loadState()
  const session = currentState.sessions.find((entry) => entry.token === token)
  if (!session) {
    return null
  }

  if (isSessionExpired(session)) {
    currentState.sessions = currentState.sessions.filter((entry) => entry.token !== token)
    persistState()
    return null
  }

  return clone(session)
}

function revokeSession(token) {
  const currentState = loadState()
  const nextSessions = currentState.sessions.filter((session) => session.token !== token)
  const removed = nextSessions.length !== currentState.sessions.length
  if (removed) {
    currentState.sessions = nextSessions
    persistState()
  }
  return removed
}

function addRefreshToken(token) {
  pruneExpiredRefreshTokens()
  const currentState = loadState()
  currentState.refreshTokens.push(token)
  persistState()
  return clone(token)
}

function findRefreshToken(tokenValue) {
  pruneExpiredRefreshTokens()
  const currentState = loadState()
  const token = currentState.refreshTokens.find((entry) => entry.token === tokenValue)
  if (!token) {
    return null
  }

  if (isRefreshTokenExpired(token)) {
    currentState.refreshTokens = currentState.refreshTokens.filter((entry) => entry.token !== tokenValue)
    persistState()
    return null
  }

  return clone(token)
}

function revokeRefreshToken(tokenValue) {
  const currentState = loadState()
  const nextTokens = currentState.refreshTokens.filter((token) => token.token !== tokenValue)
  const removed = nextTokens.length !== currentState.refreshTokens.length
  if (removed) {
    currentState.refreshTokens = nextTokens
    persistState()
  }
  return removed
}

module.exports = {
  addUser,
  addSession,
  addRefreshToken,
  findSessionByToken,
  findRefreshToken,
  findUserByEmail,
  findUserById,
  getUsers,
  normalizeEmail,
  pruneExpiredRefreshTokens,
  pruneExpiredSessions,
  revokeRefreshToken,
  revokeSession,
}
