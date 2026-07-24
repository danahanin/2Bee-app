const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.mock('../src/ai/classification/feedback', () => ({
  recordExpenseConfirmationFeedback: jest.fn(async () => ({ personalOrShared: true, hive: false })),
}))

jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } })
    }
    req.user = { userId: 'user_ziv', email: 'ziv@test.app', hiveId: null }
    return next()
  }
})

const { createApp } = require('../app')
const Expense = require('../models/Expense')
const Hive = require('../models/Hive')

describe('AI needs-review endpoints', () => {
  let mongoServer
  let app

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
    app = createApp()
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongoServer) await mongoServer.stop()
  })

  afterEach(async () => {
    await Expense.deleteMany({})
    await Hive.deleteMany({})
    jest.clearAllMocks()
  })

  async function makePendingExpense(overrides = {}) {
    return Expense.create({
      userId: 'user_ziv',
      amount: 42,
      category: 'groceries',
      description: 'SHUFERSAL',
      type: 'personal',
      source: 'bank_sync',
      date: new Date(),
      classifiedBy: 'ai',
      needsReview: true,
      ...overrides,
    })
  }

  describe('GET /ai/needs-review', () => {
    it('returns 401 without Authorization', async () => {
      const response = await request(app).get('/ai/needs-review')
      expect(response.status).toBe(401)
    })

    it('lists only the current user pending suggestions', async () => {
      await makePendingExpense()
      await makePendingExpense({ userId: 'someone_else' })

      const response = await request(app).get('/ai/needs-review').set('Authorization', 'Bearer token-ziv')

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].userId).toBe('user_ziv')
    })
  })

  describe('POST /ai/needs-review/:expenseId/resolve', () => {
    it('returns 404 for a pending suggestion that does not exist', async () => {
      const response = await request(app)
        .post(`/ai/needs-review/${new mongoose.Types.ObjectId()}/resolve`)
        .set('Authorization', 'Bearer token-ziv')
        .send({})

      expect(response.status).toBe(404)
    })

    it('returns 400 for an invalid category correction', async () => {
      const expense = await makePendingExpense()

      const response = await request(app)
        .post(`/ai/needs-review/${expense._id}/resolve`)
        .set('Authorization', 'Bearer token-ziv')
        .send({ category: 'not-a-real-category' })

      expect(response.status).toBe(400)
    })

    it('accepts the suggestion as-is', async () => {
      const expense = await makePendingExpense()

      const response = await request(app)
        .post(`/ai/needs-review/${expense._id}/resolve`)
        .set('Authorization', 'Bearer token-ziv')
        .send({})

      expect(response.status).toBe(200)
      expect(response.body.data.needsReview).toBe(false)
      expect(response.body.data.classifiedBy).toBe('ai')
    })

    it('returns 404 when correcting to a shared hive the user does not belong to', async () => {
      const expense = await makePendingExpense()
      const foreignHive = await Hive.create({ userIds: ['someone_else', 'someone_else_2'] })

      const response = await request(app)
        .post(`/ai/needs-review/${expense._id}/resolve`)
        .set('Authorization', 'Bearer token-ziv')
        .send({ type: 'shared', hiveId: String(foreignHive._id) })

      expect(response.status).toBe(404)
    })

    it('applies a correction to a hive the user belongs to and marks classifiedBy user', async () => {
      const expense = await makePendingExpense()
      const hive = await Hive.create({ userIds: ['user_ziv', 'partner'] })

      const response = await request(app)
        .post(`/ai/needs-review/${expense._id}/resolve`)
        .set('Authorization', 'Bearer token-ziv')
        .send({ type: 'shared', hiveId: String(hive._id) })

      expect(response.status).toBe(200)
      expect(response.body.data.type).toBe('shared')
      expect(response.body.data.classifiedBy).toBe('user')
    })
  })
})
