const hiveService = require('../services/hiveService')
const { CATEGORIES } = require('../models/Expense')
const { sendError } = require('../utils/appError')

async function requireHiveAccess(hiveId, userId) {
  return hiveService.getHiveById(hiveId, userId)
}

async function getHive(req, res) {
  try {
    const hive = await requireHiveAccess(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }
    res.json(hive)
  } catch (err) {
    sendError(res, err, err.message)
  }
}

async function getHiveExpenses(req, res) {
  try {
    const hive = await requireHiveAccess(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }

    const { category, from, to, page, limit } = req.query
    const result = await hiveService.getHiveExpenses(req.params.id, {
      category,
      from,
      to,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      currentUserId: req.user.userId,
    })
    res.json(result)
  } catch (err) {
    sendError(res, err, err.message)
  }
}

function validateExpenseBody(body) {
  const errors = []
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    errors.push('amount must be a positive number')
  }
  if (!body.category || !CATEGORIES.includes(body.category)) {
    errors.push(`category must be one of: ${CATEGORIES.join(', ')}`)
  }
  if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
    errors.push('description is required')
  }
  if (body.description && body.description.length > 200) {
    errors.push('description must be 200 characters or less')
  }
  if (body.date && isNaN(Date.parse(body.date))) {
    errors.push('date must be a valid date string')
  }
  return errors
}

async function createHiveExpense(req, res) {
  try {
    const hive = await requireHiveAccess(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }

    const errors = validateExpenseBody(req.body)
    if (errors.length > 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } })
    }

    const expense = await hiveService.createSharedExpense(req.params.id, req.user.userId, req.body)
    res.status(201).json(expense)
  } catch (err) {
    sendError(res, err, err.message)
  }
}

function validateExpenseBodyPartial(body) {
  const errors = []
  if (body.amount !== undefined && (typeof body.amount !== 'number' || body.amount <= 0)) {
    errors.push('amount must be a positive number')
  }
  if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
    errors.push(`category must be one of: ${CATEGORIES.join(', ')}`)
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim().length === 0) {
      errors.push('description is required')
    } else if (body.description.length > 200) {
      errors.push('description must be 200 characters or less')
    }
  }
  if (body.date !== undefined && isNaN(Date.parse(body.date))) {
    errors.push('date must be a valid date string')
  }
  return errors
}

async function updateHiveExpense(req, res) {
  try {
    const hive = await requireHiveAccess(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }

    const errors = validateExpenseBodyPartial(req.body)
    if (errors.length > 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } })
    }

    const expense = await hiveService.updateSharedExpense(
      req.params.id,
      req.params.expId,
      req.user.userId,
      req.body
    )
    if (!expense) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } })
    }

    res.json(expense)
  } catch (err) {
    sendError(res, err, err.message)
  }
}

async function deleteHiveExpense(req, res) {
  try {
    const hive = await requireHiveAccess(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }

    const expense = await hiveService.deleteSharedExpense(
      req.params.id,
      req.params.expId
    )
    if (!expense) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } })
    }

    res.json({ success: true, message: 'Expense deleted' })
  } catch (err) {
    sendError(res, err, err.message)
  }
}

function validateTransferBody(body) {
  const errors = []
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    errors.push('amount must be a positive number')
  }

  const accountTypes = ['iban', 'bban']
  if (!body.providerId || typeof body.providerId !== 'string') {
    errors.push('providerId is required')
  }
  if (!body.psuId || typeof body.psuId !== 'string') {
    errors.push('psuId is required')
  }
  if (!body.debtorAccountNumber || typeof body.debtorAccountNumber !== 'string') {
    errors.push('debtorAccountNumber is required')
  }
  if (!accountTypes.includes(body.debtorAccountType)) {
    errors.push('debtorAccountType must be iban or bban')
  }
  if (!body.creditorAccountNumber || typeof body.creditorAccountNumber !== 'string') {
    errors.push('creditorAccountNumber is required')
  }
  if (!accountTypes.includes(body.creditorAccountType)) {
    errors.push('creditorAccountType must be iban or bban')
  }
  if (!body.creditorName || typeof body.creditorName !== 'string' || body.creditorName.trim().length === 0) {
    errors.push('creditorName is required')
  }
  if (body.date !== undefined && isNaN(Date.parse(body.date))) {
    errors.push('date must be a valid date string')
  }
  if (body.redirectUrl !== undefined && typeof body.redirectUrl !== 'string') {
    errors.push('redirectUrl must be a string')
  }
  if (body.includeFakeProviders !== undefined && typeof body.includeFakeProviders !== 'boolean') {
    errors.push('includeFakeProviders must be a boolean')
  }
  return errors
}

async function getHiveBalance(req, res) {
  try {
    const hive = await requireHiveAccess(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }

    const balance = await hiveService.calculateHiveBalance(req.params.id)
    res.json(balance)
  } catch (err) {
    sendError(res, err, err.message)
  }
}

async function getHiveTransfers(req, res) {
  try {
    const hive = await requireHiveAccess(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }

    const { page, limit } = req.query
    const transfers = await hiveService.getHiveTransfers(req.params.id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    })
    res.json(transfers)
  } catch (err) {
    sendError(res, err, err.message)
  }
}

async function createHiveTransfer(req, res) {
  try {
    const hive = await requireHiveAccess(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }

    const errors = validateTransferBody(req.body)
    if (errors.length > 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } })
    }

    const result = await hiveService.createHiveTransfer(req.params.id, req.user, req.body)
    res.status(201).json(result)
  } catch (err) {
    sendError(res, err, err.message)
  }
}

async function getHiveNotifications(req, res) {
  try {
    const hive = await requireHiveAccess(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }

    const { limit } = req.query
    const notifications = await hiveService.getHiveNotifications(req.params.id, req.user.userId, {
      limit: parseInt(limit, 10) || 10,
    })
    res.json(notifications)
  } catch (err) {
    sendError(res, err, err.message)
  }
}

async function getPersonalExpenses(req, res) {
  try {
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : req.user.userId
    const isOwnData = requestedUserId === req.user.userId

    if (!isOwnData && req.user.pairId !== requestedUserId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only view your own or partner data' } })
    }

    const { category, from, to, page, limit } = req.query
    const result = await hiveService.getPersonalExpenses(requestedUserId, {
      category,
      from,
      to,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    })
    res.json(result)
  } catch (err) {
    sendError(res, err, err.message)
  }
}

module.exports = {
  getHive,
  getHiveExpenses,
  getHiveBalance,
  createHiveExpense,
  updateHiveExpense,
  deleteHiveExpense,
  getHiveTransfers,
  createHiveTransfer,
  getHiveNotifications,
  getPersonalExpenses,
}
