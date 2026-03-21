const hiveService = require('../services/hiveService')
const { CATEGORIES } = require('../models/Expense')

async function getHive(req, res) {
  try {
    const hive = await hiveService.getHiveById(req.params.id, req.user.userId)
    if (!hive) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } })
    }
    res.json(hive)
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } })
  }
}

async function getHiveExpenses(req, res) {
  try {
    const hive = await hiveService.getHiveById(req.params.id, req.user.userId)
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
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } })
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
    const hive = await hiveService.getHiveById(req.params.id, req.user.userId)
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
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } })
  }
}

async function getPersonalExpenses(req, res) {
  try {
    const { category, from, to, page, limit } = req.query
    const result = await hiveService.getPersonalExpenses(req.user.userId, {
      category,
      from,
      to,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } })
  }
}

module.exports = {
  getHive,
  getHiveExpenses,
  createHiveExpense,
  getPersonalExpenses,
}
