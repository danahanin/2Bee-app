const request = require('supertest')
const mongoose = require('mongoose')
const sharp = require('sharp')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(60000)

const tokenContexts = {
  'token-dan': {
    userId: 'user_dan',
    email: 'dan@test.app',
    firstName: 'Dan',
    lastName: 'Tester',
    pairId: null,
    hiveId: null,
  },
}

jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } })
    }
    const token = header.slice(7).trim()
    const context = tokenContexts[token]
    if (!context) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token expired or invalid' } })
    }
    req.user = { ...context }
    return next()
  }
})

jest.mock('../src/receipts/ocr/tesseractOcr', () => ({
  confidenceOf: () => 0.9,
  runOcr: async () => ({
    rawText: 'CORNER STORE\nMILK 5.00\nTOTAL 42.50',
    confidence: 0.9,
    imageRef: null,
    source: 'tesseract',
  }),
}))

const { createApp } = require('../app')
const Receipt = require('../models/Receipt')
const Expense = require('../models/Expense')

describe('Receipt scan + personal expense API', () => {
  let mongoServer
  let app
  let pngImage

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
    app = createApp()
    pngImage = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .png()
      .toBuffer()
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  beforeEach(async () => {
    await Promise.all([Receipt.deleteMany({}), Expense.deleteMany({})])
  })

  describe('POST /receipts/scan', () => {
    it('returns 401 without Authorization', async () => {
      const response = await request(app).post('/receipts/scan')
      expect(response.status).toBe(401)
      expect(response.body.error?.code).toBe('UNAUTHORIZED')
    })

    it('returns 400 when no image is attached', async () => {
      const response = await request(app).post('/receipts/scan').set('Authorization', 'Bearer token-dan')
      expect(response.status).toBe(400)
      expect(response.body.error?.code).toBe('NO_FILE')
    })

    it('runs OCR, persists a Receipt, and returns a draft', async () => {
      const response = await request(app)
        .post('/receipts/scan')
        .set('Authorization', 'Bearer token-dan')
        .attach('image', pngImage, 'receipt.png')

      expect(response.status).toBe(201)
      const draft = response.body.data
      expect(draft.receiptId).toEqual(expect.any(String))
      expect(draft.ocr).toEqual(
        expect.objectContaining({ source: 'tesseract', rawText: expect.stringContaining('CORNER STORE') }),
      )
      expect(draft.extracted).toEqual(expect.objectContaining({ amount: null, category: null }))

      const stored = await Receipt.findById(draft.receiptId).lean()
      expect(stored).not.toBeNull()
      expect(stored.userId).toBe('user_dan')
      expect(stored.status).toBe('scanned')
      expect(stored.ocr.rawText).toContain('TOTAL 42.50')
    })

    it('returns 415 for an undecodable image without persisting a Receipt', async () => {
      const response = await request(app)
        .post('/receipts/scan')
        .set('Authorization', 'Bearer token-dan')
        .attach('image', Buffer.from([1, 2, 3, 4]), 'broken.png')

      expect(response.status).toBe(415)
      expect(response.body.error?.code).toBe('UNSUPPORTED_IMAGE')
      expect(await Receipt.countDocuments({})).toBe(0)
    })
  })

  describe('POST /expenses', () => {
    it('returns 400 for an invalid body', async () => {
      const response = await request(app)
        .post('/expenses')
        .set('Authorization', 'Bearer token-dan')
        .send({ amount: -1 })
      expect(response.status).toBe(400)
      expect(response.body.error?.code).toBe('VALIDATION_ERROR')
    })

    it('creates a personal expense and links it back to the receipt', async () => {
      const receipt = await Receipt.create({ userId: 'user_dan', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/expenses')
        .set('Authorization', 'Bearer token-dan')
        .send({
          amount: 42.5,
          category: 'groceries',
          description: 'Corner store run',
          date: '2026-06-13',
          receiptId: String(receipt._id),
        })

      expect(response.status).toBe(201)
      expect(response.body).toEqual(
        expect.objectContaining({
          type: 'personal',
          hiveId: null,
          source: 'receipt',
          amount: 42.5,
          category: 'groceries',
        }),
      )

      const updatedReceipt = await Receipt.findById(receipt._id).lean()
      expect(updatedReceipt.status).toBe('confirmed')
      expect(String(updatedReceipt.expenseId)).toBe(String(response.body._id))
    })

    it('defaults source to manual when no receiptId is provided', async () => {
      const response = await request(app)
        .post('/expenses')
        .set('Authorization', 'Bearer token-dan')
        .send({ amount: 10, category: 'dining', description: 'Lunch', date: '2026-06-13' })

      expect(response.status).toBe(201)
      expect(response.body.source).toBe('manual')
    })
  })
})
