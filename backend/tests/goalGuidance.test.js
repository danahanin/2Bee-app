const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(60000)

const tokenContexts = {
  'token-user-a': {
    userId: 'user_a',
    email: 'a@test.app',
    firstName: 'User',
    lastName: 'A',
    pairId: 'user_b',
    hiveId: null,
  },
  'token-user-b': {
    userId: 'user_b',
    email: 'b@test.app',
    firstName: 'User',
    lastName: 'B',
    pairId: 'user_a',
    hiveId: null,
  },
  'token-user-c': {
    userId: 'user_c',
    email: 'c@test.app',
    firstName: 'User',
    lastName: 'C',
    pairId: null,
    hiveId: null,
  },
}

jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' },
      })
    }

    const token = header.slice(7).trim()
    const context = tokenContexts[token]
    if (!context) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token expired or invalid' },
      })
    }

    req.user = { ...context }
    return next()
  }
})

jest.mock('../src/ai/goalGuidancePrompt', () => ({
  generateGoalGuidance: jest.fn(),
}))

const { generateGoalGuidance } = require('../src/ai/goalGuidancePrompt')
const { createApp } = require('../app')
const Hive = require('../models/Hive')
const Goal = require('../models/Goal')

const VALID_GUIDANCE = {
  summary: 'You have already completed 25% of your goal.',
  monthlyTargetExplanation: 'Reaching the rest within the time left would take about ₪1,000 per month.',
  actionSteps: ['Decide on a fixed monthly amount.', 'Review progress at the end of each month.'],
  alternativeOption: 'Extending the deadline by two months would reduce the required monthly amount.',
}

describe('Goal guidance API', () => {
  let mongoServer
  let app
  let hiveId
  let personalGoalId
  let sharedGoalId

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
    app = createApp()
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  beforeEach(async () => {
    jest.clearAllMocks()
    await Promise.all([Hive.deleteMany({}), Goal.deleteMany({})])

    const hive = await Hive.create({ userIds: ['user_a', 'user_b'], isActive: true })
    hiveId = hive._id.toString()

    const deadline = new Date()
    deadline.setUTCMonth(deadline.getUTCMonth() + 6)

    const personalGoal = await Goal.create({
      userId: 'user_a',
      hiveId: null,
      title: 'Vacation fund',
      targetAmount: 8000,
      currentAmount: 2000,
      deadline,
      category: 'travel',
    })
    personalGoalId = personalGoal._id.toString()

    const sharedGoal = await Goal.create({
      userId: 'user_a',
      hiveId,
      title: 'Home repair',
      targetAmount: 4000,
      currentAmount: 1000,
      deadline,
    })
    sharedGoalId = sharedGoal._id.toString()
  })

  it('returns AI guidance and deterministic metrics for the owner of a personal goal', async () => {
    generateGoalGuidance.mockResolvedValue(VALID_GUIDANCE)

    const response = await request(app)
      .post(`/goals/${personalGoalId}/guidance`)
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(200)
    expect(response.body.guidance).toEqual(VALID_GUIDANCE)
    expect(response.body.metrics.status).toBe('on_track')
    expect(response.body.metrics.remainingAmount).toBe(6000)
    expect(response.body.metrics.progressPercent).toBe(25)

    // Only fixed goal facts + computed metrics were handed to the LLM layer — no
    // partner info, raw transactions, or bank data.
    const callArg = generateGoalGuidance.mock.calls[0][0]
    expect(callArg.goal.title).toBe('Vacation fund')
    expect(callArg.goal).not.toHaveProperty('pairId')
    expect(callArg.goal).not.toHaveProperty('bankAccount')
  })

  it('rejects a personal goal request from a user who does not own it', async () => {
    const response = await request(app)
      .post(`/goals/${personalGoalId}/guidance`)
      .set('Authorization', 'Bearer token-user-b')

    expect(response.status).toBe(403)
    expect(generateGoalGuidance).not.toHaveBeenCalled()
  })

  it('allows any Hive member to request guidance for a shared goal', async () => {
    generateGoalGuidance.mockResolvedValue(VALID_GUIDANCE)

    const response = await request(app)
      .post(`/goals/${sharedGoalId}/guidance`)
      .set('Authorization', 'Bearer token-user-b')

    expect(response.status).toBe(200)
    expect(response.body.guidance).toEqual(VALID_GUIDANCE)
  })

  it('rejects a shared goal request from a user outside the Hive', async () => {
    const response = await request(app)
      .post(`/goals/${sharedGoalId}/guidance`)
      .set('Authorization', 'Bearer token-user-c')

    expect(response.status).toBe(403)
    expect(generateGoalGuidance).not.toHaveBeenCalled()
  })

  it('returns 404 for a goal id that does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId().toString()

    const response = await request(app)
      .post(`/goals/${missingId}/guidance`)
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(404)
  })

  it('returns 400 for a malformed goal id', async () => {
    const response = await request(app)
      .post('/goals/not-a-valid-id/guidance')
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(400)
    expect(generateGoalGuidance).not.toHaveBeenCalled()
  })

  it('returns 400 and never calls the LLM when the stored goal data is invalid', async () => {
    // Bypass Mongoose validation to simulate corrupted/legacy data.
    await Goal.collection.updateOne({ _id: new mongoose.Types.ObjectId(personalGoalId) }, { $set: { targetAmount: 0 } })

    const response = await request(app)
      .post(`/goals/${personalGoalId}/guidance`)
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(400)
    expect(generateGoalGuidance).not.toHaveBeenCalled()
  })

  it('returns a safe error and leaves the Goal untouched when the LLM call fails', async () => {
    generateGoalGuidance.mockRejectedValue(new Error('LLM unavailable'))

    const response = await request(app)
      .post(`/goals/${personalGoalId}/guidance`)
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('AI_GUIDANCE_UNAVAILABLE')

    const unchanged = await Goal.findById(personalGoalId).lean()
    expect(unchanged.currentAmount).toBe(2000)
    expect(unchanged.targetAmount).toBe(8000)
  })

  it('handles a completed goal without requiring a monthly amount', async () => {
    const completedGoal = await Goal.create({
      userId: 'user_a',
      hiveId: null,
      title: 'Emergency fund',
      targetAmount: 1000,
      currentAmount: 1000,
      deadline: new Date(),
    })
    generateGoalGuidance.mockResolvedValue({
      summary: 'Congratulations, you reached your goal!',
      monthlyTargetExplanation: 'No further monthly contribution is required.',
      actionSteps: ['Review the achievement.', 'Consider setting a new goal.'],
      alternativeOption: 'Set a new goal to keep building on this progress.',
    })

    const response = await request(app)
      .post(`/goals/${completedGoal._id.toString()}/guidance`)
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(200)
    expect(response.body.metrics.status).toBe('completed')
    expect(response.body.metrics.requiredMonthlyAmount).toBeNull()
  })
})
