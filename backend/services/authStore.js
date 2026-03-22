const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const STORE_FILE = path.join(DATA_DIR, 'auth-store.json')

const defaultState = {
  users: [],
  sessions: [],
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
    state = { users: [], sessions: [] }
    return state
  }

  try {
    const parsed = JSON.parse(raw)
    state = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    }
  } catch (error) {
    state = { users: [], sessions: [] }
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

function pruneExpiredSessions() {
  const currentState = loadState()
  const nextSessions = currentState.sessions.filter((session) => !isSessionExpired(session))
  if (nextSessions.length !== currentState.sessions.length) {
    currentState.sessions = nextSessions
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

module.exports = {
  addUser,
  addSession,
  findSessionByToken,
  findUserByEmail,
  findUserById,
  getUsers,
  normalizeEmail,
  pruneExpiredSessions,
  revokeSession,
}
