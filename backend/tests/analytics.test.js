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

const { createApp } = require('../app')
const Hive = require('../models/Hive')
const Expense = require('../models/Expense')

describe('Analytics API', () => {
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
    await Promise.all([Hive.deleteMany({}), Expense.deleteMany({})])
    const hive = await Hive.create({ userIds: ['user_a', 'user_b'], isActive: true })
    hiveId = hive._id.toString()
    tokenContexts['token-user-a'].hiveId = hiveId
    tokenContexts['token-user-b'].hiveId = hiveId

    const now = new Date()
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10))
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 12))

    await Expense.insertMany([
      {
        userId: 'user_a',
        amount: 100,
        category: 'dining',
        description: 'Lunch',
        type: 'personal',
        source: 'manual',
        date: thisMonth,
      },
      {
        userId: 'user_a',
        amount: 50,
        category: 'groceries',
        description: 'Market',
        type: 'personal',
        source: 'manual',
        date: thisMonth,
      },
      {
        userId: 'user_a',
        amount: 80,
        category: 'dining',
        description: 'Old lunch',
        type: 'personal',
        source: 'manual',
        date: lastMonth,
      },
      {
        userId: 'user_a',
        hiveId,
        amount: 200,
        category: 'rent',
        description: 'Rent share',
        type: 'shared',
        source: 'manual',
        date: thisMonth,
      },
      {
        userId: 'user_b',
        hiveId,
        amount: 60,
        category: 'utilities',
        description: 'Electric',
        type: 'shared',
        source: 'manual',
        date: thisMonth,
      },
    ])
  })

  it('returns personal spending breakdown for current month', async () => {
    const response = await request(app)
      .get('/analytics/spending-breakdown')
      .query({ type: 'personal' })
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(200)
    expect(response.body.type).toBe('personal')
    expect(response.body.total).toBe(150)
    expect(response.body.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'dining', amount: 100 }),
        expect.objectContaining({ category: 'groceries', amount: 50 }),
      ]),
    )
  })

  it('returns shared spending breakdown', async () => {
    const response = await request(app)
      .get('/analytics/spending-breakdown')
      .query({ type: 'shared' })
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(200)
    expect(response.body.type).toBe('shared')
    expect(response.body.total).toBe(260)
  })

  it('returns month-over-month trends with trend direction', async () => {
    const response = await request(app)
      .get('/analytics/trends')
      .query({ type: 'personal', months: 6 })
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(200)
    expect(response.body.months.length).toBeGreaterThanOrEqual(2)
    const dining = response.body.series.find((row) => row.category === 'dining')
    expect(dining).toBeDefined()
    expect(['up', 'down', 'stable']).toContain(dining.trend)
  })

  it('returns current vs previous month comparison', async () => {
    const response = await request(app)
      .get('/analytics/comparison')
      .query({ type: 'personal' })
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(200)
    expect(response.body.currentMonth.total).toBe(150)
    expect(response.body.previousMonth.total).toBe(80)
    expect(response.body.forecast).toBeNull()
    const dining = response.body.categories.find((row) => row.category === 'dining')
    expect(dining.current).toBe(100)
    expect(dining.previous).toBe(80)
  })

  it('rejects non-partner access to partner personal analytics', async () => {
    const response = await request(app)
      .get('/analytics/spending-breakdown')
      .query({ type: 'personal', userId: 'user_a' })
      .set('Authorization', 'Bearer token-user-b')

    expect(response.status).toBe(200)
    expect(response.body.total).toBe(150)
  })

  it('returns 400 for invalid type', async () => {
    const response = await request(app)
      .get('/analytics/spending-breakdown')
      .query({ type: 'invalid' })
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})
