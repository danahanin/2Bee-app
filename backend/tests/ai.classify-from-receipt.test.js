const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.mock('../src/ai/phase1/classifyPersonalShared', () => ({
  classifyPersonalShared: jest.fn(async () => ({
    type: 'personal',
    confidence: 0.85,
    reasoning: 'Coffee shop purchase looks personal',
    retrieved: [{ text: 'coffee solo', type: 'personal', score: 0.9 }],
  })),
}))

jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } })
    }
    req.user = { userId: 'user_ziv', email: 'ziv@test.app' }
    return next()
  }
})

const { createApp } = require('../app')
const { classifyPersonalShared } = require('../src/ai/phase1/classifyPersonalShared')

describe('POST /ai/classify-from-receipt', () => {
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
    const response = await request(app)
      .post('/ai/classify-from-receipt')
      .send({ vendor: 'Cafe', rawText: 'COFFEE 18' })

    expect(response.status).toBe(401)
  })

  it('returns 400 when vendor and rawText are missing', async () => {
    const response = await request(app)
      .post('/ai/classify-from-receipt')
      .set('Authorization', 'Bearer token-ziv')
      .send({ amount: 10 })

    expect(response.status).toBe(400)
    expect(response.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns a Classification for a valid receipt body', async () => {
    classifyPersonalShared.mockResolvedValueOnce({
      type: 'shared',
      confidence: 0.92,
      reasoning: 'Grocery receipt for household',
      retrieved: [{ text: 'supermarket groceries', type: 'shared', score: 0.88 }],
    })

    const response = await request(app)
      .post('/ai/classify-from-receipt')
      .set('Authorization', 'Bearer token-ziv')
      .send({
        vendor: 'Shufersal',
        amount: 120,
        category: 'groceries',
        date: '2026-06-13',
        lineItems: [{ description: 'Milk', amount: 6 }],
        rawText: 'SHUFERSAL TOTAL 120',
      })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      type: 'shared',
      confidence: 0.92,
      reasoning: 'Grocery receipt for household',
      retrieved: [{ text: 'supermarket groceries', type: 'shared', score: 0.88 }],
    })
    expect(classifyPersonalShared).toHaveBeenCalledWith(
      expect.objectContaining({
        vendor: 'Shufersal',
        amount: 120,
        category: 'groceries',
      }),
    )
  })
})
