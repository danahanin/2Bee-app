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

const mockGetInsights = jest.fn()
jest.mock('../src/services/ai.service', () => {
  const actual = jest.requireActual('../src/services/ai.service')
  return {
    ...actual,
    getInsights: (...args) => mockGetInsights(...args),
  }
})

const { createApp } = require('../app')
const { resolveBudgetAlertLevel } = require('../services/dashboardService')
const Hive = require('../models/Hive')
const Expense = require('../models/Expense')
const Budget = require('../models/Budget')

describe('resolveBudgetAlertLevel', () => {
  it('returns null below 80%', () => {
    expect(resolveBudgetAlertLevel(0)).toBeNull()
    expect(resolveBudgetAlertLevel(79)).toBeNull()
  })

  it('returns warning at 80–99%', () => {
    expect(resolveBudgetAlertLevel(80)).toBe('warning')
    expect(resolveBudgetAlertLevel(99)).toBe('warning')
  })

  it('returns critical at 100%+', () => {
    expect(resolveBudgetAlertLevel(100)).toBe('critical')
    expect(resolveBudgetAlertLevel(150)).toBe('critical')
  })
})

describe('GET /dashboard/personal — PR5 topInsight + alertLevel', () => {
  let mongoServer
  let app
  let hiveId

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
    mockGetInsights.mockReset()
    mockGetInsights.mockResolvedValue([])
    await Promise.all([
      Hive.deleteMany({}),
      Expense.deleteMany({}),
      Budget.deleteMany({}),
    ])

    const hive = await Hive.create({ userIds: ['user_a', 'user_b'], isActive: true })
    hiveId = hive._id.toString()
    tokenContexts['token-user-a'].hiveId = hiveId
  })

  it('keeps insightPlaceholder and adds topInsight from AI insights', async () => {
    const insight = {
      id: 'insight-1',
      type: 'budget_warning',
      title: 'Budget alert for dining',
      description: 'You have used 85% of your dining budget.',
      confidence: 0.75,
      category: 'dining',
      createdAt: new Date().toISOString(),
    }
    mockGetInsights.mockResolvedValue([insight])

    const res = await request(app)
      .get('/dashboard/personal')
      .set('Authorization', 'Bearer token-user-a')
      .expect(200)

    expect(res.body.insightPlaceholder).toBeNull()
    expect(res.body.topInsight).toEqual(insight)
    expect(mockGetInsights).toHaveBeenCalledWith({
      userId: 'user_a',
      hiveId,
      scope: 'personal',
    })
  })

  it('returns 200 with topInsight null when AI insights fail', async () => {
    mockGetInsights.mockRejectedValue(new Error('AI unavailable'))

    const res = await request(app)
      .get('/dashboard/personal')
      .set('Authorization', 'Bearer token-user-a')
      .expect(200)

    expect(res.body.topInsight).toBeNull()
    expect(res.body.insightPlaceholder).toBeNull()
    expect(res.body).toHaveProperty('totalSpendThisMonth')
    expect(res.body).toHaveProperty('budgetStatus')
  })

  it('returns 200 with topInsight null when AI returns no insights', async () => {
    mockGetInsights.mockResolvedValue([])

    const res = await request(app)
      .get('/dashboard/personal')
      .set('Authorization', 'Bearer token-user-a')
      .expect(200)

    expect(res.body.topInsight).toBeNull()
  })

  it('adds alertLevel on budgetStatus without removing existing fields', async () => {
    const now = new Date()
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10))

    await Budget.create([
      {
        userId: 'user_a',
        hiveId,
        category: 'dining',
        limitAmount: 100,
        period: 'monthly',
        type: 'personal',
      },
      {
        userId: 'user_a',
        hiveId,
        category: 'groceries',
        limitAmount: 100,
        period: 'monthly',
        type: 'personal',
      },
      {
        userId: 'user_a',
        hiveId,
        category: 'transport',
        limitAmount: 100,
        period: 'monthly',
        type: 'personal',
      },
    ])

    await Expense.insertMany([
      {
        userId: 'user_a',
        amount: 50,
        category: 'dining',
        description: 'Under threshold',
        type: 'personal',
        source: 'manual',
        date: thisMonth,
      },
      {
        userId: 'user_a',
        amount: 85,
        category: 'groceries',
        description: 'Warning threshold',
        type: 'personal',
        source: 'manual',
        date: thisMonth,
      },
      {
        userId: 'user_a',
        amount: 100,
        category: 'transport',
        description: 'Critical threshold',
        type: 'personal',
        source: 'manual',
        date: thisMonth,
      },
    ])

    const res = await request(app)
      .get('/dashboard/personal')
      .set('Authorization', 'Bearer token-user-a')
      .expect(200)

    const byCategory = Object.fromEntries(
      res.body.budgetStatus.map((item) => [item.category, item]),
    )

    expect(byCategory.dining).toMatchObject({
      category: 'dining',
      limit: 100,
      spent: 50,
      percentUsed: 50,
      period: 'monthly',
      type: 'personal',
      alertLevel: null,
    })
    expect(byCategory.dining).toHaveProperty('id')

    expect(byCategory.groceries).toMatchObject({
      percentUsed: 85,
      alertLevel: 'warning',
    })

    expect(byCategory.transport).toMatchObject({
      percentUsed: 100,
      alertLevel: 'critical',
    })
  })
})
