const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(60000)

const tokenContexts = {
  'token-user-1': {
    userId: 'user_demo_1',
    email: 'demo1@2bee.app',
    firstName: 'Ziv',
    lastName: 'Ben Ephraim',
    pairId: 'user_demo_2',
    hiveId: null,
  },
  'token-user-2': {
    userId: 'user_demo_2',
    email: 'demo2@2bee.app',
    firstName: 'Maya',
    lastName: 'Levi',
    pairId: 'user_demo_1',
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
const User = require('../models/User')

describe('Hive API', () => {
  let mongoServer
  let app
  let hiveId

  async function seedData() {
    await User.create([
      {
        _id: 'user_demo_1',
        email: 'demo1@2bee.app',
        emailLower: 'demo1@2bee.app',
        passwordHash: 'hash1',
        firstName: 'Ziv',
        lastName: 'Ben Ephraim',
        pairId: 'user_demo_2',
        bio: '',
      },
      {
        _id: 'user_demo_2',
        email: 'demo2@2bee.app',
        emailLower: 'demo2@2bee.app',
        passwordHash: 'hash2',
        firstName: 'Maya',
        lastName: 'Levi',
        pairId: 'user_demo_1',
        bio: '',
      },
    ])

    const hive = await Hive.create({ userIds: ['user_demo_1', 'user_demo_2'] })
    hiveId = hive._id.toString()
    tokenContexts['token-user-1'].hiveId = hiveId
    tokenContexts['token-user-2'].hiveId = hiveId
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
    app = createApp()
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongoServer) await mongoServer.stop()
  })

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Hive.deleteMany({}), Expense.deleteMany({})])
    await seedData()
  })

  // --- GET /hive/:id ---

  it('GET /hive/:id returns hive for a member', async () => {
    const res = await request(app)
      .get(`/hive/${hiveId}`)
      .set('Authorization', 'Bearer token-user-1')

    expect(res.status).toBe(200)
    expect(res.body.userIds).toContain('user_demo_1')
    expect(res.body.userIds).toContain('user_demo_2')
  })

  it('GET /hive/:id returns 401 without token', async () => {
    const res = await request(app).get(`/hive/${hiveId}`)
    expect(res.status).toBe(401)
  })

  it('GET /hive/:id returns 404 for invalid id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await request(app)
      .get(`/hive/${fakeId}`)
      .set('Authorization', 'Bearer token-user-1')

    expect(res.status).toBe(404)
  })

  // --- POST /hive/:id/expenses ---

  it('POST /hive/:id/expenses creates a shared expense', async () => {
    const res = await request(app)
      .post(`/hive/${hiveId}/expenses`)
      .set('Authorization', 'Bearer token-user-1')
      .send({
        amount: 150,
        category: 'groceries',
        description: 'Weekly groceries',
        date: '2026-03-20',
      })

    expect(res.status).toBe(201)
    expect(res.body.amount).toBe(150)
    expect(res.body.type).toBe('shared')
    expect(res.body.userId).toBe('user_demo_1')
  })

  it('POST /hive/:id/expenses rejects invalid category', async () => {
    const res = await request(app)
      .post(`/hive/${hiveId}/expenses`)
      .set('Authorization', 'Bearer token-user-1')
      .send({
        amount: 100,
        category: 'invalid_category',
        description: 'Test',
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('POST /hive/:id/expenses rejects negative amount', async () => {
    const res = await request(app)
      .post(`/hive/${hiveId}/expenses`)
      .set('Authorization', 'Bearer token-user-1')
      .send({
        amount: -50,
        category: 'groceries',
        description: 'Negative',
      })

    expect(res.status).toBe(400)
  })

  // --- GET /hive/:id/expenses ---

  it('GET /hive/:id/expenses returns paginated shared expenses', async () => {
    await Expense.create([
      { hiveId, userId: 'user_demo_1', amount: 100, category: 'groceries', description: 'A', type: 'shared', date: new Date() },
      { hiveId, userId: 'user_demo_2', amount: 200, category: 'dining', description: 'B', type: 'shared', date: new Date() },
    ])

    const res = await request(app)
      .get(`/hive/${hiveId}/expenses`)
      .set('Authorization', 'Bearer token-user-1')

    expect(res.status).toBe(200)
    expect(res.body.expenses).toHaveLength(2)
    expect(res.body.total).toBe(2)
    expect(res.body.page).toBe(1)
  })

  it('GET /hive/:id/expenses filters by category', async () => {
    await Expense.create([
      { hiveId, userId: 'user_demo_1', amount: 100, category: 'groceries', description: 'A', type: 'shared', date: new Date() },
      { hiveId, userId: 'user_demo_2', amount: 200, category: 'dining', description: 'B', type: 'shared', date: new Date() },
    ])

    const res = await request(app)
      .get(`/hive/${hiveId}/expenses?category=groceries`)
      .set('Authorization', 'Bearer token-user-1')

    expect(res.status).toBe(200)
    expect(res.body.expenses).toHaveLength(1)
    expect(res.body.expenses[0].category).toBe('groceries')
  })

  it('GET /hive/:id/expenses excludes deleted expenses', async () => {
    await Expense.create([
      { hiveId, userId: 'user_demo_1', amount: 100, category: 'groceries', description: 'Active', type: 'shared', date: new Date() },
      { hiveId, userId: 'user_demo_1', amount: 50, category: 'dining', description: 'Deleted', type: 'shared', date: new Date(), isDeleted: true },
    ])

    const res = await request(app)
      .get(`/hive/${hiveId}/expenses`)
      .set('Authorization', 'Bearer token-user-1')

    expect(res.status).toBe(200)
    expect(res.body.expenses).toHaveLength(1)
    expect(res.body.expenses[0].description).toBe('Active')
  })

  // --- PUT /hive/:id/expenses/:expId ---

  it('PUT /hive/:id/expenses/:expId updates an expense', async () => {
    const expense = await Expense.create({
      hiveId, userId: 'user_demo_1', amount: 100, category: 'groceries', description: 'Original', type: 'shared', date: new Date(),
    })

    const res = await request(app)
      .put(`/hive/${hiveId}/expenses/${expense._id}`)
      .set('Authorization', 'Bearer token-user-1')
      .send({ amount: 200, description: 'Updated' })

    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(200)
    expect(res.body.description).toBe('Updated')
  })

  it('PUT /hive/:id/expenses/:expId returns 404 for non-existent expense', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await request(app)
      .put(`/hive/${hiveId}/expenses/${fakeId}`)
      .set('Authorization', 'Bearer token-user-1')
      .send({ amount: 200 })

    expect(res.status).toBe(404)
  })

  // --- DELETE /hive/:id/expenses/:expId ---

  it('DELETE /hive/:id/expenses/:expId soft deletes an expense', async () => {
    const expense = await Expense.create({
      hiveId, userId: 'user_demo_1', amount: 100, category: 'groceries', description: 'To delete', type: 'shared', date: new Date(),
    })

    const res = await request(app)
      .delete(`/hive/${hiveId}/expenses/${expense._id}`)
      .set('Authorization', 'Bearer token-user-1')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const deleted = await Expense.findById(expense._id)
    expect(deleted.isDeleted).toBe(true)
  })

  // --- GET /hive/:id/balance ---

  it('GET /hive/:id/balance returns balanced state when no expenses', async () => {
    const res = await request(app)
      .get(`/hive/${hiveId}/balance`)
      .set('Authorization', 'Bearer token-user-1')

    expect(res.status).toBe(200)
    expect(res.body.balanceStatus).toBe('balanced')
    expect(res.body.totalSharedSpend).toBe(0)
  })

  it('GET /hive/:id/balance detects imbalance', async () => {
    await Expense.create([
      { hiveId, userId: 'user_demo_1', amount: 300, category: 'groceries', description: 'A', type: 'shared', date: new Date() },
      { hiveId, userId: 'user_demo_2', amount: 100, category: 'dining', description: 'B', type: 'shared', date: new Date() },
    ])

    const res = await request(app)
      .get(`/hive/${hiveId}/balance`)
      .set('Authorization', 'Bearer token-user-1')

    expect(res.status).toBe(200)
    expect(res.body.balanceStatus).toBe('imbalanced')
    expect(res.body.totalSharedSpend).toBe(400)
    expect(res.body.suggestedTransfer).toBeDefined()
    expect(res.body.suggestedTransfer.fromUserId).toBe('user_demo_2')
    expect(res.body.suggestedTransfer.toUserId).toBe('user_demo_1')
    expect(res.body.suggestedTransfer.amount).toBe(100)
  })

  // --- GET /expenses/personal ---

  it('GET /expenses/personal returns only the user\'s personal expenses', async () => {
    await Expense.create([
      { userId: 'user_demo_1', amount: 80, category: 'shopping', description: 'My thing', type: 'personal', date: new Date() },
      { userId: 'user_demo_2', amount: 50, category: 'health', description: 'Partner thing', type: 'personal', date: new Date() },
      { hiveId, userId: 'user_demo_1', amount: 100, category: 'groceries', description: 'Shared', type: 'shared', date: new Date() },
    ])

    const res = await request(app)
      .get('/expenses/personal')
      .set('Authorization', 'Bearer token-user-1')

    expect(res.status).toBe(200)
    expect(res.body.expenses).toHaveLength(1)
    expect(res.body.expenses[0].description).toBe('My thing')
    expect(res.body.expenses[0].type).toBe('personal')
  })
})
