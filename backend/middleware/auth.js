const mongoose = require('mongoose')
const Hive = require('../models/Hive')
const { getUserFromToken } = require('../services/authService')

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } })
  }

  const token = header.slice(7).trim()
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } })
  }

  const context = getUserFromToken(token)
  if (!context) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token expired or invalid' } })
  }

  const userId = context.user.id

  let hiveId = context.user.hiveId || null
  if (mongoose.connection.readyState === 1) {
    try {
      const hive = await Hive.findOne({ userIds: userId, isActive: true })
      if (hive) {
        hiveId = hive._id.toString()
      }
    } catch (error) {
      console.warn('authMiddleware hive lookup failed:', error.message)
    }
  }

  req.user = {
    userId,
    email: context.user.email,
    firstName: context.user.firstName,
    lastName: context.user.lastName,
    hiveId,
    pairId: context.user.pairId || null,
  }
  req.session = {
    token: context.session.token,
    expiresAt: context.session.expiresAt,
  }
  return next()
}

module.exports = authMiddleware
