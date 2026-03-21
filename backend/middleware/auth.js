/**
 * Auth middleware placeholder — Dana Hanin (Profile & Settings domain)
 *
 * This is a temporary stand-in that will be replaced by Bar Cohen's full
 * JWT implementation in Sprint 3. It checks for any Bearer token in the
 * Authorization header and attaches a mock req.user so all Profile &
 * Settings stubs can be tested end-to-end right now.
 *
 * TODO (Bar Cohen, Sprint 3): Replace this file with real JWT verification:
 *   - Verify token signature with the app secret
 *   - Decode userId, hiveId, pairId from the JWT payload
 *   - Return 401 for expired or malformed tokens
 */

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid Authorization header' })
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: token required' })
  }

  // Placeholder: accept any non-empty token and attach a demo user.
  // Bar's real implementation will verify the JWT signature here.
  req.user = {
    userId: 'user_demo_1',
    email: 'demo@2bee.app',
    firstName: 'Demo',
    lastName: 'User',
    hiveId: 'hive_demo_1',
    pairId: 'pair_demo_1',
  }

  next()
}

module.exports = authMiddleware
