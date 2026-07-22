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
  'token-bar': {
    userId: 'user_bar',
    email: 'bar@test.app',
    firstName: 'Bar',
    lastName: 'Tester',
    pairId: 'user_partner',
    hiveId: null,
  },
}

const mockUpsertExample = jest.fn(async () => ({}))

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
    rawText: 'CORNER STORE\n123 Main St\n13/06/2026\nMILK 5.00\nBREAD 3.50\nTOTAL 42.50',
    confidence: 0.9,
    imageRef: null,
    source: 'tesseract',
  }),
}))

jest.mock('../src/ai/phase1/classifyPersonalShared', () => ({
  classifyPersonalShared: jest.fn(async () => ({
    type: 'shared',
    confidence: 0.88,
    reasoning: 'Grocery store receipt',
    retrieved: [{ text: 'supermarket run', type: 'shared', score: 0.9 }],
  })),
}))

jest.mock('../src/ai/rag', () => ({
  upsertExample: mockUpsertExample,
}))

const { createApp } = require('../app')
const Receipt = require('../models/Receipt')
const Expense = require('../models/Expense')
const Hive = require('../models/Hive')
const ExpenseGroup = require('../models/ExpenseGroup')

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
    await Promise.all([Receipt.deleteMany({}), Expense.deleteMany({}), Hive.deleteMany({}), ExpenseGroup.deleteMany({})])
    mockUpsertExample.mockClear()
    tokenContexts['token-bar'].hiveId = null
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
      expect(draft.extracted).toEqual(
        expect.objectContaining({
          vendor: 'CORNER STORE',
          amount: 42.5,
          currency: 'ILS',
          date: '2026-06-13',
          category: expect.any(String),
          lineItems: expect.arrayContaining([
            expect.objectContaining({ description: 'MILK', amount: 5 }),
          ]),
        }),
      )
      expect(draft.fieldConfidence).toEqual(
        expect.objectContaining({
          vendor: expect.any(Number),
          amount: expect.any(Number),
        }),
      )
      expect(draft.classification).toEqual(
        expect.objectContaining({
          type: 'shared',
          confidence: 0.88,
          reasoning: expect.any(String),
          retrieved: expect.any(Array),
        }),
      )

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

  describe('POST /receipts/confirm', () => {
    function sharedConfirmBody(overrides = {}) {
      return {
        receiptId: overrides.receiptId,
        type: 'shared',
        classifiedBy: 'user',
        extracted: {
          vendor: 'Cafe Aroma',
          amount: 68,
          category: 'dining',
          date: '2026-06-13',
          rawText: 'Cafe Aroma total 68',
          lineItems: [{ description: 'Coffee', amount: 18 }],
        },
        expense: {
          amount: 68,
          category: 'dining',
          description: 'Cafe Aroma',
          date: '2026-06-13',
        },
        ...overrides,
      }
    }

    it('creates a shared expense with an expenseGroupId and stores feedback', async () => {
      const hive = await Hive.create({ userIds: ['user_bar', 'user_partner'] })
      tokenContexts['token-bar'].hiveId = String(hive._id)
      const expenseGroup = await ExpenseGroup.create({
        hiveId: hive._id,
        name: 'Work',
        userIds: ['user_bar', 'user_partner'],
      })
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send(
          sharedConfirmBody({
            receiptId: String(receipt._id),
            expenseGroupId: String(expenseGroup._id),
          }),
        )

      expect(response.status).toBe(201)
      expect(response.body.data.feedbackStored).toBe(true)
      expect(response.body.data.expense).toEqual(
        expect.objectContaining({
          type: 'shared',
          source: 'receipt',
          amount: 68,
          category: 'dining',
        }),
      )
      expect(String(response.body.data.expense.expenseGroupId)).toBe(String(expenseGroup._id))
      expect(mockUpsertExample).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Cafe Aroma'),
          metadata: expect.objectContaining({
            type: 'shared',
            source: 'dynamic',
            hiveId: String(hive._id),
            expenseGroupId: String(expenseGroup._id),
            groupName: 'Work',
          }),
        }),
      )

      const stored = await Expense.findById(response.body.data.expense._id).lean()
      expect(String(stored.expenseGroupId)).toBe(String(expenseGroup._id))

      const updatedReceipt = await Receipt.findById(receipt._id).lean()
      expect(updatedReceipt.status).toBe('confirmed')
      expect(String(updatedReceipt.expenseId)).toBe(String(stored._id))
    })

    it('still confirms when RAG feedback fails after expense creation', async () => {
      const hive = await Hive.create({ userIds: ['user_bar', 'user_partner'] })
      tokenContexts['token-bar'].hiveId = String(hive._id)
      const expenseGroup = await ExpenseGroup.create({
        hiveId: hive._id,
        name: 'Work',
        userIds: ['user_bar', 'user_partner'],
      })
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      mockUpsertExample.mockRejectedValueOnce(new Error('fetch failed'))

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send(
          sharedConfirmBody({
            receiptId: String(receipt._id),
            expenseGroupId: String(expenseGroup._id),
          }),
        )

      expect(response.status).toBe(201)
      expect(response.body.data.feedbackStored).toBe(false)
      expect(response.body.data.expense).toEqual(
        expect.objectContaining({
          type: 'shared',
          source: 'receipt',
          amount: 68,
        }),
      )
      expect(mockUpsertExample).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(String(response.body.data.expense._id)),
        'fetch failed',
      )

      const expenses = await Expense.find({ receiptId: receipt._id }).lean()
      expect(expenses).toHaveLength(1)
      expect(String(expenses[0]._id)).toBe(String(response.body.data.expense._id))

      const updatedReceipt = await Receipt.findById(receipt._id).lean()
      expect(updatedReceipt.status).toBe('confirmed')
      expect(String(updatedReceipt.expenseId)).toBe(String(expenses[0]._id))

      warnSpy.mockRestore()
    })

    it('creates a shared expense on the general Hive when expenseGroupId is null', async () => {
      const hive = await Hive.create({ userIds: ['user_bar', 'user_partner'] })
      tokenContexts['token-bar'].hiveId = String(hive._id)
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send(
          sharedConfirmBody({
            receiptId: String(receipt._id),
            expenseGroupId: null,
          }),
        )

      expect(response.status).toBe(201)
      expect(response.body.data.expenseGroup).toBeNull()
      expect(response.body.data.expense).toEqual(
        expect.objectContaining({
          type: 'shared',
          source: 'receipt',
          amount: 68,
        }),
      )
      expect(response.body.data.expense.expenseGroupId).toBeNull()
      expect(String(response.body.data.expense.hiveId)).toBe(String(hive._id))

      const stored = await Expense.findById(response.body.data.expense._id).lean()
      expect(stored.expenseGroupId).toBeNull()
      expect(String(stored.hiveId)).toBe(String(hive._id))

      expect(mockUpsertExample).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Cafe Aroma'),
          metadata: expect.objectContaining({
            type: 'shared',
            source: 'dynamic',
            hiveId: String(hive._id),
            expenseId: String(stored._id),
          }),
        }),
      )
      const feedbackMeta = mockUpsertExample.mock.calls[0][0].metadata
      expect(feedbackMeta).not.toHaveProperty('expenseGroupId')
      expect(feedbackMeta).not.toHaveProperty('groupName')
    })

    it('creates a shared expense on the general Hive when expenseGroupId is omitted', async () => {
      const hive = await Hive.create({ userIds: ['user_bar', 'user_partner'] })
      tokenContexts['token-bar'].hiveId = String(hive._id)
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send(
          sharedConfirmBody({
            receiptId: String(receipt._id),
          }),
        )

      expect(response.status).toBe(201)
      expect(response.body.data.expenseGroup).toBeNull()
      expect(response.body.data.expense.expenseGroupId).toBeNull()
      expect(String(response.body.data.expense.hiveId)).toBe(String(hive._id))
    })

    it('returns MISSING_HIVE when no hive is available for a shared confirm', async () => {
      tokenContexts['token-bar'].hiveId = null
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send(
          sharedConfirmBody({
            receiptId: String(receipt._id),
            expenseGroupId: null,
          }),
        )

      expect(response.status).toBe(400)
      expect(response.body.error?.code).toBe('MISSING_HIVE')
    })

    it('returns HIVE_NOT_FOUND when the user is not a hive member', async () => {
      const hive = await Hive.create({ userIds: ['someone_else', 'another_user'] })
      tokenContexts['token-bar'].hiveId = String(hive._id)
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send(
          sharedConfirmBody({
            receiptId: String(receipt._id),
            expenseGroupId: null,
          }),
        )

      expect(response.status).toBe(404)
      expect(response.body.error?.code).toBe('HIVE_NOT_FOUND')
    })

    it('returns INVALID_EXPENSE_GROUP for an inactive expense group', async () => {
      const hive = await Hive.create({ userIds: ['user_bar', 'user_partner'] })
      tokenContexts['token-bar'].hiveId = String(hive._id)
      const inactiveGroup = await ExpenseGroup.create({
        hiveId: hive._id,
        name: 'Trip',
        userIds: ['user_bar', 'user_partner'],
        isActive: false,
      })
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send(
          sharedConfirmBody({
            receiptId: String(receipt._id),
            expenseGroupId: String(inactiveGroup._id),
          }),
        )

      expect(response.status).toBe(400)
      expect(response.body.error?.code).toBe('INVALID_EXPENSE_GROUP')
    })

    it('returns INVALID_EXPENSE_GROUP for an expense group from another hive', async () => {
      const hive = await Hive.create({ userIds: ['user_bar', 'user_partner'] })
      const otherHive = await Hive.create({ userIds: ['user_other', 'user_other_2'] })
      tokenContexts['token-bar'].hiveId = String(hive._id)
      const foreignGroup = await ExpenseGroup.create({
        hiveId: otherHive._id,
        name: 'Work',
        userIds: ['user_other', 'user_other_2'],
      })
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send(
          sharedConfirmBody({
            receiptId: String(receipt._id),
            expenseGroupId: String(foreignGroup._id),
          }),
        )

      expect(response.status).toBe(400)
      expect(response.body.error?.code).toBe('INVALID_EXPENSE_GROUP')
    })

    it('returns INVALID_EXPENSE_GROUP for a malformed expense group id', async () => {
      const hive = await Hive.create({ userIds: ['user_bar', 'user_partner'] })
      tokenContexts['token-bar'].hiveId = String(hive._id)
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send(
          sharedConfirmBody({
            receiptId: String(receipt._id),
            expenseGroupId: 'not-a-valid-object-id',
          }),
        )

      expect(response.status).toBe(400)
      expect(response.body.error?.code).toBe('INVALID_EXPENSE_GROUP')
    })

    it('creates a personal expense without requiring a hive group', async () => {
      const receipt = await Receipt.create({ userId: 'user_bar', imageRef: 'x.png', status: 'scanned' })

      const response = await request(app)
        .post('/receipts/confirm')
        .set('Authorization', 'Bearer token-bar')
        .send({
          receiptId: String(receipt._id),
          type: 'personal',
          classifiedBy: 'user',
          extracted: {
            vendor: 'Solo Cafe',
            amount: 12,
            category: 'dining',
            date: '2026-06-13',
            rawText: 'Solo Cafe 12',
          },
          expense: {
            amount: 12,
            category: 'dining',
            description: 'Solo Cafe',
            date: '2026-06-13',
          },
        })

      expect(response.status).toBe(201)
      expect(response.body.data.expense).toEqual(
        expect.objectContaining({
          type: 'personal',
          source: 'receipt',
          amount: 12,
          hiveId: null,
        }),
      )
      expect(response.body.data.expenseGroup).toBeNull()
      expect(response.body.data.feedbackStored).toBe(false)
      expect(mockUpsertExample).not.toHaveBeenCalled()

      const updatedReceipt = await Receipt.findById(receipt._id).lean()
      expect(updatedReceipt.status).toBe('confirmed')
    })
  })
})
