const dashboardService = require('../services/dashboardService')

async function getPersonal(req, res) {
  try {
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : req.user.userId
    const isOwnData = requestedUserId === req.user.userId

    if (!isOwnData && req.user.pairId !== requestedUserId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only view your own or partner data' } })
    }

    const summary = await dashboardService.getPersonalDashboard(
      requestedUserId,
      isOwnData ? req.user.hiveId : null
    )
    res.json(summary)
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } })
  }
}

async function getShared(req, res) {
  try {
    const { userId, hiveId } = req.user
    const summary = await dashboardService.getSharedDashboard(userId, hiveId)
    if (summary === null) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Hive not found or access denied' } })
    }
    res.json(summary)
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } })
  }
}

module.exports = {
  getPersonal,
  getShared,
}
