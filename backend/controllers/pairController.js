const { z } = require('zod')
const pairService = require('../services/pairService')

const joinSchema = z
  .object({
    code: z.string().trim().regex(/^[A-Za-z0-9]{6}$/),
  })
  .strict()

function userFallback(req) {
  return {
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    pairId: req.user.pairId,
    hiveId: req.user.hiveId,
  }
}

function zodMessage(error) {
  return error.issues?.map((issue) => issue.message).join('; ') || 'Invalid request payload.'
}

async function generatePairCode(req, res, next) {
  try {
    const result = await pairService.generatePairCode(req.user.userId, userFallback(req))
    return res.status(201).json(result)
  } catch (error) {
    return next(error)
  }
}

async function joinPair(req, res, next) {
  const parsed = joinSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: zodMessage(parsed.error) } })
  }

  try {
    const result = await pairService.joinPairCode(req.user.userId, parsed.data.code, userFallback(req))
    return res.json(result)
  } catch (error) {
    return next(error)
  }
}

async function getPairStatus(req, res, next) {
  try {
    const result = await pairService.getPairStatus(req.user.userId, userFallback(req))
    return res.json(result)
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  generatePairCode,
  joinPair,
  getPairStatus,
}
