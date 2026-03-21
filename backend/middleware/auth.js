/**
 * Stub auth middleware — attaches a demo user to req.user.
 * Will be replaced by Bar's real JWT middleware once available.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } })
  }

  const token = header.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } })
  }

  // Stub: any non-empty token is accepted; attach demo user
  req.user = {
    userId: 'user_demo_1',
    hiveId: null, // will be populated after seeding
    pairId: null,
  }

  next()
}

module.exports = authMiddleware
