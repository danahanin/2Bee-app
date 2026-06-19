const analyticsService = require('../services/analyticsService')
const { AppError, sendError } = require('../utils/appError')
const { parseExpenseType, parseMonthsCount } = require('../utils/parseDateRange')

function resolvePersonalUserId(req) {
  const requested =
    typeof req.query.userId === 'string' ? req.query.userId.trim() : req.user.userId

  if (requested !== req.user.userId && req.user.pairId !== requested) {
    throw new AppError(403, 'FORBIDDEN', 'You can only view your own or partner data')
  }

  return requested
}

function handleError(res, err) {
  return sendError(res, err)
}

async function getSpendingBreakdown(req, res) {
  try {
    const type = parseExpenseType(req.query.type)
    const userId = type === 'personal' ? resolvePersonalUserId(req) : req.user.userId
    const hiveId = type === 'shared' ? req.user.hiveId : null

    const payload = await analyticsService.getSpendingBreakdown({
      type,
      userId,
      hiveId,
      fromInput: req.query.from,
      toInput: req.query.to,
    })
    res.json(payload)
  } catch (err) {
    return handleError(res, err)
  }
}

async function getTrends(req, res) {
  try {
    const type = parseExpenseType(req.query.type)
    const userId = type === 'personal' ? resolvePersonalUserId(req) : req.user.userId
    const hiveId = type === 'shared' ? req.user.hiveId : null
    const monthsCount = parseMonthsCount(req.query.months)

    const payload = await analyticsService.getTrends({
      type,
      userId,
      hiveId,
      monthsCount,
      fromInput: req.query.from,
      toInput: req.query.to,
    })
    res.json(payload)
  } catch (err) {
    return handleError(res, err)
  }
}

async function getComparison(req, res) {
  try {
    const type = parseExpenseType(req.query.type)
    const userId = type === 'personal' ? resolvePersonalUserId(req) : req.user.userId
    const hiveId = type === 'shared' ? req.user.hiveId : null

    const payload = await analyticsService.getComparison({
      type,
      userId,
      hiveId,
    })
    res.json(payload)
  } catch (err) {
    return handleError(res, err)
  }
}

module.exports = {
  getSpendingBreakdown,
  getTrends,
  getComparison,
}
