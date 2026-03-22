const dashboardService = require('../services/dashboardService')

async function getPersonal(req, res) {
  try {
    const { userId, hiveId } = req.user
    const summary = await dashboardService.getPersonalDashboard(userId, hiveId)
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
