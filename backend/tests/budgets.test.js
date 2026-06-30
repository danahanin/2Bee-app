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
const Budget = require('../models/Budget')
const Expense = require('../models/Expense')

describe('Budgets API', () => {
  let mongoServer
  let app
  let hiveId
  let personalBudgetId
  let sharedBudgetId

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
    await Promise.all([Hive.deleteMany({}), Budget.deleteMany({}), Expense.deleteMany({})])

    const hive = await Hive.create({ userIds: ['user_a', 'user_b'], isActive: true })
    hiveId = hive._id.toString()
    tokenContexts['token-user-a'].hiveId = hiveId
    tokenContexts['token-user-b'].hiveId = hiveId

    const personal = await Budget.create({
      userId: 'user_a',
      hiveId: null,
      category: 'dining',
      limitAmount: 400,
      period: 'monthly',
      type: 'personal',
    })
    personalBudgetId = personal._id.toString()

    const shared = await Budget.create({
      userId: 'user_a',
      hiveId,
      category: 'groceries',
      limitAmount: 900,
      period: 'monthly',
      type: 'shared',
    })
    sharedBudgetId = shared._id.toString()

    const now = new Date()
    await Expense.create({
      userId: 'user_a',
      amount: 100,
      category: 'dining',
      description: 'Lunch',
      type: 'personal',
      source: 'manual',
      date: now,
    })
  })

  it('lists personal budgets with spend rollup', async () => {
    const response = await request(app)
      .get('/budgets')
      .query({ type: 'personal' })
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(200)
    expect(response.body.budgets).toHaveLength(1)
    expect(response.body.budgets[0]).toMatchObject({
      category: 'dining',
      type: 'personal',
      limit: 400,
      spent: 100,
      percentUsed: 25,
    })
  })

  it('lists shared budgets for hive members', async () => {
    const response = await request(app)
      .get('/budgets')
      .query({ type: 'shared' })
      .set('Authorization', 'Bearer token-user-b')

    expect(response.status).toBe(200)
    expect(response.body.budgets).toHaveLength(1)
    expect(response.body.budgets[0].category).toBe('groceries')
  })

  it('creates a personal budget', async () => {
    const response = await request(app)
      .post('/budgets')
      .set('Authorization', 'Bearer token-user-a')
      .send({
        category: 'transport',
        limit: 250,
        period: 'monthly',
        type: 'personal',
      })

    expect(response.status).toBe(201)
    expect(response.body.category).toBe('transport')
    expect(response.body.limit).toBe(250)
  })

  it('rejects duplicate personal budget for same category', async () => {
    const response = await request(app)
      .post('/budgets')
      .set('Authorization', 'Bearer token-user-a')
      .send({
        category: 'dining',
        limit: 500,
        period: 'monthly',
        type: 'personal',
      })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('DUPLICATE_BUDGET')
  })

  it('allows partner B to update shared budget', async () => {
    const response = await request(app)
      .put(`/budgets/${sharedBudgetId}`)
      .set('Authorization', 'Bearer token-user-b')
      .send({ limit: 1000 })

    expect(response.status).toBe(200)
    expect(response.body.limit).toBe(1000)
  })

  it('allows partner B to delete shared budget', async () => {
    const response = await request(app)
      .delete(`/budgets/${sharedBudgetId}`)
      .set('Authorization', 'Bearer token-user-b')

    expect(response.status).toBe(200)
    expect(response.body.deleted).toBe(true)
  })

  it('rejects shared budget creation without hive', async () => {
    tokenContexts['token-user-a'].hiveId = null

    const response = await request(app)
      .post('/budgets')
      .set('Authorization', 'Bearer token-user-a')
      .send({
        category: 'rent',
        limit: 2000,
        period: 'monthly',
        type: 'shared',
      })

    tokenContexts['token-user-a'].hiveId = hiveId
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('NO_HIVE')
  })

  it('rejects access to another users personal budget', async () => {
    const response = await request(app)
      .put(`/budgets/${personalBudgetId}`)
      .set('Authorization', 'Bearer token-user-b')
      .send({ limit: 999 })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})
