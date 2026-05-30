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

const { createApp } = require('../app')
const User = require('../models/User')
const Hive = require('../models/Hive')
const Expense = require('../models/Expense')

describe('Privacy filter middleware integration', () => {
  let mongoServer
  let app
  let hiveId

  async function seedUsersAndHive() {
    const hive = await Hive.create({ userIds: ['user_a', 'user_b'], isActive: true })
    hiveId = hive._id.toString()

    await User.create([
      {
        _id: 'user_a',
        email: 'a@test.app',
        emailLower: 'a@test.app',
        passwordHash: 'hash-a',
        firstName: 'User',
        lastName: 'A',
        pairId: 'user_b',
        hiveId,
      },
      {
        _id: 'user_b',
        email: 'b@test.app',
        emailLower: 'b@test.app',
        passwordHash: 'hash-b',
        firstName: 'User',
        lastName: 'B',
        pairId: 'user_a',
        hiveId,
      },
      {
        _id: 'user_c',
        email: 'c@test.app',
        emailLower: 'c@test.app',
        passwordHash: 'hash-c',
        firstName: 'User',
        lastName: 'C',
        pairId: null,
        hiveId: null,
      },
    ])

    tokenContexts['token-user-a'].hiveId = hiveId
    tokenContexts['token-user-b'].hiveId = hiveId
    tokenContexts['token-user-c'].hiveId = null
  }

  async function setPrivacyForUserA(settings) {
    await User.findByIdAndUpdate('user_a', {
      privacySettings: {
        hidePersonalIncome: false,
        hidePersonalExpenses: false,
        hidePersonalBalance: false,
        ...settings,
      },
    })
  }

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
    await Promise.all([User.deleteMany({}), Hive.deleteMany({}), Expense.deleteMany({})])
    await seedUsersAndHive()
  })

  it('hides income fields from partner when hidePersonalIncome is true', async () => {
    await setPrivacyForUserA({ hidePersonalIncome: true })

    const response = await request(app)
      .get('/dashboard/personal')
      .query({ userId: 'user_a' })
      .set('Authorization', 'Bearer token-user-b')

    expect(response.status).toBe(200)
    expect(response.body.income).toBeUndefined()
    expect(response.body.monthlyIncome).toBeUndefined()
    expect(response.body.annualIncome).toBeUndefined()
  })

  it('shows income fields to partner when hidePersonalIncome is false', async () => {
    await setPrivacyForUserA({ hidePersonalIncome: false })

    const response = await request(app)
      .get('/dashboard/personal')
      .query({ userId: 'user_a' })
      .set('Authorization', 'Bearer token-user-b')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('income')
    expect(response.body).toHaveProperty('monthlyIncome')
    expect(response.body).toHaveProperty('annualIncome')
  })

  it('hides personal expenses from partner when hidePersonalExpenses is true', async () => {
    await setPrivacyForUserA({ hidePersonalExpenses: true })

    await Expense.create([
      {
        userId: 'user_a',
        amount: 120,
        category: 'shopping',
        description: 'A personal expense',
        type: 'personal',
        source: 'manual',
        date: new Date(),
      },
    ])

    const response = await request(app)
      .get('/expenses/personal')
      .query({ userId: 'user_a' })
      .set('Authorization', 'Bearer token-user-b')

    expect(response.status).toBe(200)
    expect(response.body.expenses.length).toBe(0)
    expect(response.body.expenses.every((expense) => expense.type !== 'personal')).toBe(true)
  })

  it('does not filter own personal expenses for the same user', async () => {
    await setPrivacyForUserA({ hidePersonalExpenses: true })

    await Expense.create({
      userId: 'user_a',
      amount: 50,
      category: 'health',
      description: 'Own personal expense',
      type: 'personal',
      source: 'manual',
      date: new Date(),
    })

    const response = await request(app)
      .get('/expenses/personal')
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(200)
    expect(response.body.expenses.some((expense) => expense.type === 'personal')).toBe(true)
  })

  it('blocks non-partner users from requesting another user personal expenses', async () => {
    const response = await request(app)
      .get('/expenses/personal')
      .query({ userId: 'user_a' })
      .set('Authorization', 'Bearer token-user-c')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})
