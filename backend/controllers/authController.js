const authService = require('../services/authService')
const { sendError, AppError } = require('../utils/appError')

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validationError(res, errors) {
  return res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Please correct the highlighted fields.',
      details: errors,
    },
  })
}

function extractToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim()
  }
  if (req.body?.token) {
    return req.body.token
  }
  return null
}

function formatAuthResponse({ session, refreshToken, user }) {
  if (!session || !refreshToken) {
    throw new AppError(500, 'AUTH_RESPONSE_ERROR', 'Missing session tokens.')
  }

  return {
    accessToken: session.token,
    expiresAt: session.expiresAt,
    refreshToken: refreshToken.token,
    refreshExpiresAt: refreshToken.expiresAt,
    user,
  }
}

function validateRegisterPayload(body = {}) {
  const errors = {}
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (firstName.length < 2 || firstName.length > 50) {
    errors.firstName = 'First name must be between 2 and 50 characters.'
  }

  if (lastName.length < 2 || lastName.length > 50) {
    errors.lastName = 'Last name must be between 2 and 50 characters.'
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.email = 'A valid email address is required.'
  }

  if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.'
  }

  return { errors, firstName, lastName, email, password }
}

function validateLoginPayload(body = {}) {
  const errors = {}
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Enter a valid email.'
  }

  if (password.length === 0) {
    errors.password = 'Password is required.'
  }

  return { errors, email, password }
}

async function register(req, res) {
  const { errors, firstName, lastName, email, password } = validateRegisterPayload(req.body)
  if (Object.keys(errors).length > 0) {
    return validationError(res, errors)
  }

  try {
    const user = await authService.registerUser({ firstName, lastName, email, password })
    return res.status(201).json({ user })
  } catch (error) {
    return sendError(res, error, 'Unable to register right now.')
  }
}

async function login(req, res) {
  const { errors, email, password } = validateLoginPayload(req.body)

  if (Object.keys(errors).length > 0) {
    return validationError(res, errors)
  }

  try {
    const result = await authService.loginUser({ email, password })
    return res.json(formatAuthResponse(result))
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, error, error.message)
    }
    return sendError(res, error, 'Unable to login right now.')
  }
}

async function logout(req, res) {
  try {
    const accessToken = extractToken(req)
    const refreshToken = req.body?.refreshToken || null
    if (!accessToken && !refreshToken) {
      throw new AppError(400, 'TOKEN_REQUIRED', 'Missing token.')
    }
    await authService.logoutUser({ accessToken, refreshToken })
    return res.json({ success: true })
  } catch (error) {
    return sendError(res, error, 'Unable to logout right now.')
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body || {}
    if (!refreshToken) {
      throw new AppError(400, 'TOKEN_REQUIRED', 'Refresh token is required.')
    }

    const result = await authService.refreshSession({ refreshToken })
    return res.json(formatAuthResponse(result))
  } catch (error) {
    return sendError(res, error, 'Unable to refresh session right now.')
  }
}

module.exports = {
  login,
  logout,
  refresh,
  register,
}
