const { z } = require('zod')
const goalService = require('../services/goalService')
const { sendError } = require('../utils/appError')

const createGoalSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    targetAmount: z.number().positive(),
    currentAmount: z.number().min(0).optional(),
    deadline: z.string().min(1),
    category: z.string().min(1).optional(),
    hiveId: z.string().min(1).optional().nullable(),
  })
  .strict()

function zodMessage(error) {
  return error.issues?.map((issue) => issue.message).join('; ') || 'Invalid request payload.'
}

function parseGoalScope(value) {
  if (value == null || value === '' || value === 'all') return 'all'
  if (value === 'personal' || value === 'shared') return value
  return null
}

async function listGoals(req, res) {
  try {
    const scope = parseGoalScope(req.query.scope)
    if (req.query.scope && scope == null) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'scope must be personal, shared, or all' },
      })
    }

    const goals = await goalService.listGoals(req.user.userId, req.user.hiveId, scope)
    res.json({ goals })
  } catch (err) {
    return sendError(res, err)
  }
}

async function createGoal(req, res) {
  const parsed = createGoalSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: zodMessage(parsed.error) } })
  }

  try {
    const goal = await goalService.createGoal(req.user.userId, req.user.hiveId, parsed.data)
    res.status(201).json(goal)
  } catch (err) {
    return sendError(res, err)
  }
}

module.exports = {
  listGoals,
  createGoal,
}
