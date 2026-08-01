const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.mock('../src/ai/classification', () => ({
  classifyExpense: jest.fn(),
  fromManualExpense: jest.requireActual('../src/ai/classification/expenseSignal').fromManualExpense,
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
const { classifyExpense } = require('../src/ai/classification')

describe('POST /ai/classify-expense', () => {
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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 without Authorization', async () => {
    const response = await request(app).post('/ai/classify-expense').send({ description: 'Coffee', amount: 18 })

    expect(response.status).toBe(401)
  })

  it('returns 400 when description is missing', async () => {
    const response = await request(app)
      .post('/ai/classify-expense')
      .set('Authorization', 'Bearer token-ziv')
      .send({ amount: 18 })

    expect(response.status).toBe(400)
    expect(response.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when amount is missing or not a number', async () => {
    const response = await request(app)
      .post('/ai/classify-expense')
      .set('Authorization', 'Bearer token-ziv')
      .send({ description: 'Coffee' })

    expect(response.status).toBe(400)
    expect(response.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for a malformed hiveId', async () => {
    const response = await request(app)
      .post('/ai/classify-expense')
      .set('Authorization', 'Bearer token-ziv')
      .send({ description: 'Coffee', amount: 18, hiveId: 'not-an-id' })

    expect(response.status).toBe(400)
    expect(response.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when the hiveId override is not one of the user hives', async () => {
    const response = await request(app)
      .post('/ai/classify-expense')
      .set('Authorization', 'Bearer token-ziv')
      .send({ description: 'Coffee', amount: 18, hiveId: new mongoose.Types.ObjectId().toString() })

    expect(response.status).toBe(404)
  })

  it('returns the full suggestion bundle for a valid manual expense', async () => {
    classifyExpense.mockResolvedValueOnce({
      category: { value: 'dining', confidence: 0.8, source: 'ai' },
      personalOrShared: { value: 'personal', confidence: 0.9, reasoning: 'solo coffee', retrieved: [], source: 'ai' },
      hive: null,
    })

    const response = await request(app)
      .post('/ai/classify-expense')
      .set('Authorization', 'Bearer token-ziv')
      .send({ description: 'Coffee at Cafe Aroma', amount: 18 })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      category: { value: 'dining', confidence: 0.8, source: 'ai' },
      personalOrShared: { value: 'personal', confidence: 0.9, reasoning: 'solo coffee', retrieved: [], source: 'ai' },
      hive: null,
    })
    expect(classifyExpense).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Coffee at Cafe Aroma', amount: 18 }),
      { userId: 'user_ziv', hiveId: null },
    )
  })
})
