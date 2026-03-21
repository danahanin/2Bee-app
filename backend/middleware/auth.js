/**
 * Stub auth middleware — attaches a demo user to req.user.
 * Will be replaced by Bar's real JWT middleware once available.
 */
const Hive = require('../models/Hive')

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } })
  }

  const token = header.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } })
  }

  const userId = 'user_demo_1'

  try {
    const hive = await Hive.findOne({ userIds: userId, isActive: true })
    req.user = {
      userId,
      email: 'demo@2bee.app',
      firstName: 'Demo',
      lastName: 'User',
      hiveId: hive?._id?.toString() || null,
      pairId: null,
    }
    next()
  } catch (err) {
    req.user = { userId, email: 'demo@2bee.app', firstName: 'Demo', lastName: 'User', hiveId: null, pairId: null }
    next()
  }
}

module.exports = authMiddleware
