const { z } = require('zod')
const budgetService = require('../services/budgetService')
const { sendError } = require('../utils/appError')

const createBudgetSchema = z
  .object({
    category: z.string().min(1),
    limit: z.number().positive(),
    period: z.enum(['monthly', 'weekly', 'yearly']),
    type: z.enum(['personal', 'shared']),
  })
  .strict()

const updateBudgetSchema = z
  .object({
    category: z.string().min(1).optional(),
    limit: z.number().positive().optional(),
    period: z.enum(['monthly', 'weekly', 'yearly']).optional(),
  })
  .strict()

function zodMessage(error) {
  return error.issues?.map((issue) => issue.message).join('; ') || 'Invalid request payload.'
}

function parseBudgetType(value) {
  if (value == null || value === '') return undefined
  if (value === 'personal' || value === 'shared') return value
  return null
}

async function listBudgets(req, res) {
  try {
    const type = parseBudgetType(req.query.type)
    if (req.query.type && type == null) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'type must be personal or shared' },
      })
    }

    const budgets = await budgetService.listBudgets(req.user.userId, req.user.hiveId, type)
    res.json({ budgets })
  } catch (err) {
    return sendError(res, err)
  }
}

async function createBudget(req, res) {
  const parsed = createBudgetSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: zodMessage(parsed.error) } })
  }

  try {
    const budget = await budgetService.createBudget(req.user.userId, req.user.hiveId, parsed.data)
    res.status(201).json(budget)
  } catch (err) {
    return sendError(res, err)
  }
}

async function updateBudget(req, res) {
  const parsed = updateBudgetSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: zodMessage(parsed.error) } })
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'At least one field is required' },
    })
  }

  try {
    const budget = await budgetService.updateBudget(
      req.params.id,
      req.user.userId,
      req.user.hiveId,
      parsed.data,
    )
    res.json(budget)
  } catch (err) {
    return sendError(res, err)
  }
}

async function deleteBudget(req, res) {
  try {
    const result = await budgetService.deleteBudget(req.params.id, req.user.userId, req.user.hiveId)
    res.json(result)
  } catch (err) {
    return sendError(res, err)
  }
}

module.exports = {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
}
